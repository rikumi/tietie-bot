import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { load as $ } from 'cheerio';
import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, IWhoAmI } from 'matrix-bot-sdk';
import config from '../../config.json';
import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';

export class MatrixUserBotClient extends EventEmitter implements GenericClient<any, any, any> {
  public bot: MatrixClient;
  public botInfo: IWhoAmI | undefined;

  private cachedMedia = new Map<string, string>();
  private pendingMediaUpload: Promise<void> | undefined;

  public constructor() {
    super();
    const storage = new SimpleFsStorageProvider(path.resolve(__dirname, '../../matrix-bot-storage.json'));
    const homeServer = config.matrixHomeServer || 'matrix.org';
    const accessToken = config.matrixAccessToken;
    this.bot = new MatrixClient('https://' + homeServer, accessToken, storage);
    this.bot.on('room.message', async (roomId: string, message: any) => {
      const transformedMessage = await this.transformMessage(message, roomId);
      if (transformedMessage.userId === this.botInfo?.user_id) return;
      this.emit(message.content['m.new_content'] ? 'edit-message' : 'message', transformedMessage);
    });
    AutojoinRoomsMixin.setupOnClient(this.bot);
    this.fetchBotInfo();
  }

  public async start(): Promise<void> {
    this.bot.start();
  }

  public async stop(): Promise<void> {
    this.bot.stop();
  }

  public async flushMedia(mxcUri: string) {
    await this.uploadToMxcUri(mxcUri, 'https://mag.wcoomd.org/uploads/2018/05/blank.pdf'); // TODO: change this to a blank image
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    const matrixEventContent: any = {
      body: message.media ? `${message.text} ${message.media.url}` : message.text,
      msgtype: 'm.text',
      'm.relates_to': message.messageIdReplied ? { 'm.in_reply_to': { event_id: message.messageIdReplied } } : undefined,
    };
    if (message.media && message.media.size < 1024 * 1024) {
      const isSticker = message.media.type === 'sticker';
      const isSupportedSticker = isSticker && message.media.mimeType === 'image/jpeg';
      const matrixMediaType = isSticker && !isSupportedSticker ? 'video' : message.media.type === 'photo' ? 'image' : message.media.type;
      const displayWidth = isSticker ? (message.media.width ?? 512) / 2 : message.media.width;
      const displayHeight = isSticker ? (message.media.height ?? 512) / 2 : message.media.height;
      matrixEventContent.url = await this.getMxcUriAndUpload(message.media.url!);
      matrixEventContent.info = { h: displayHeight, w: displayWidth, mimetype: message.media.mimeType!, size: message.media.size! }
      matrixEventContent.msgtype = 'm.' + matrixMediaType;
    }
    const matrixEventType = matrixEventContent.msgtype === 'm.sticker' ? 'm.sticker' : 'm.room.message';
    const messageId = await this.bot.sendEvent(message.chatId, matrixEventType, matrixEventContent);
    return {
      ...message,
      clientName: 'matrix',
      messageId,
      userId: this.botInfo!.user_id,
      userName: this.botInfo!.user_id,
      rawMessage: { id: messageId, content: message.text },
      rawUser: this.botInfo,
      unixDate: Date.now() / 1000,
    };
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    // MSC2676
    await this.bot.sendEvent(message.chatId, 'm.room.message', {
      body: `* ${message.text}`,
      msgtype: 'm.text',
      'm.new_content': { body: message.text, msgtype: 'm.text' },
      'm.relates_to': { rel_type: 'm.replace', event_id: message.messageId },
    });
  }

  private async transformMessage(message: any, roomId: string): Promise<GenericMessage> {
    const attachmentType = message.content.info?.mimetype?.split('/')[0];
    const editedContent = message.content['m.new_content'];
    const getBody = (msg: any) => {
      if (msg.formatted_body) {
        return $(msg.formatted_body.split(/<\/\s*mx-reply\s*>/i).pop()).text();
      }
      return msg.body;
    };
    const media = attachmentType ? {
      type: ({
        image: 'photo',
        video: 'video',
      } as any)[attachmentType] || 'file',
      url: this.bot.mxcToHttp(message.content.url),
      mimeType: message.content.info?.mimetype,
      size: message.content.info?.size,
    } : undefined;
    return {
      clientName: 'matrix',
      text: editedContent ? getBody(editedContent) : getBody(message.content),
      userId: message.sender,
      userName: (await this.bot.getUserProfile(message.sender)).displayname,
      chatId: roomId,
      messageId: editedContent ? message.content['m.relates_to'].event_id : message.event_id,
      media,
      messageIdReplied: message.content['m.relates_to']?.['m.in_reply_to']?.event_id,
      rawMessage: message,
      rawUser: message.author!,
      rawMessageReplied: message.content['m.relates_to']?.['m.in_reply_to'],
      unixDate: message.origin_server_ts / 1000,
    }
  }

  private async fetchBotInfo() {
    try {
      this.botInfo = await this.bot.getWhoAmI();
      console.error('[MatrixUserBotClient] fetchBotInfo finish', this.botInfo);
    } catch (e) {
      console.error('[MatrixUserBotClient] fetchBotInfo error, retry in 5s', e);
      setTimeout(() => this.fetchBotInfo(), 5000);
    }
  }

  private async getMxcUriAndUpload(url: string) {
    const existingUri = this.cachedMedia.get(url);
    if (existingUri) {
      return existingUri;
    }

    // await pending uploads by current process
    while (this.pendingMediaUpload) {
      await this.pendingMediaUpload;
    }

    // fetching uri should be included in the pendingMediaUpload promise...
    const mxcUriPromise = this.bot.doRequest('POST', '/_matrix/media/v1/create').then(res => res.content_uri);

    this.pendingMediaUpload = (async () => {
      const mxcUri = await mxcUriPromise;
      await this.uploadToMxcUri(mxcUri, url);
    })();

    // ...and also be awaited alone
    return await mxcUriPromise;
  }

  private async uploadToMxcUri(mxcUri: string, url: string) {
    const resource = await fetch(url);
    const contentType = resource.headers.get('Content-Type') ?? resource.headers.get('content-type') ?? 'application/octet-stream';
    const buffer = Buffer.from(await resource.arrayBuffer());
    const [, serverName, mediaId] = /^mxc:\/\/(.*?)\/(.+)$/.exec(mxcUri)!;
    await this.bot.doRequest('PUT', `/_matrix/media/v3/upload/${serverName}/${mediaId}`, {
      filename: contentType.replace(/\//g, '.'), // temporary, yet geek
    }, buffer, 60000, undefined, contentType);
    this.cachedMedia.set(url, mxcUri);
    this.pendingMediaUpload = undefined;
  }
}

export default new MatrixUserBotClient();
