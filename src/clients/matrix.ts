import { EventEmitter } from 'events';
import path from 'path';
import { load as $ } from 'cheerio';
import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, IWhoAmI } from 'matrix-bot-sdk';
import config from '../../config.json';
import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';

export class MatrixUserBotClient extends EventEmitter implements GenericClient<any, any, any> {
  public bot: MatrixClient;
  public botInfo: IWhoAmI | undefined;

  private cachedMedia = new Map<string, string>();

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

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    const isSupportedSticker = message.mediaType === 'sticker' && message.mediaMimeType === 'image/jpeg';
    const matrixMediaType = message.mediaType === 'sticker' && !isSupportedSticker ? 'video' : message.mediaType === 'photo' ? 'image' : message.mediaType;
    const matrixEventType = matrixMediaType === 'sticker' ? 'm.sticker' : 'm.room.message';
    const matrixEventContent = {
      body: message.text,
      url: message.mediaType ? await this.uploadMediaAsync(message.mediaUrl!) : undefined,
      info: { h: 160, w: 160, mimetype: message.mediaMimeType!, size: message.mediaSize! },
      msgtype: 'm.' + (matrixMediaType ?? 'text'),
      'm.relates_to': message.messageIdReplied ? { 'm.in_reply_to': { event_id: message.messageIdReplied } } : undefined,
    };
    console.log('[MatrixUserBotClient] sending event:', matrixEventType, matrixEventContent);
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
    return {
      clientName: 'matrix',
      text: editedContent ? getBody(editedContent) : getBody(message.content),
      userId: message.sender,
      userName: (await this.bot.getUserProfile(message.sender)).displayname,
      chatId: roomId,
      messageId: editedContent ? message.content['m.relates_to'].event_id : message.event_id,
      mediaType: attachmentType ? ({
        image: 'photo',
        video: 'video',
      } as any)[attachmentType] || 'file' : undefined,
      mediaUrl: attachmentType ? this.bot.mxcToHttp(message.content.url) : undefined,
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

  private async uploadMediaAsync(url: string) {
    const existingUri = this.cachedMedia.get(url);
    if (existingUri) {
      console.log('[MatrixUserBotClient] using cached media:', this.bot.mxcToHttp(existingUri));
      return existingUri;
    }
    // https://spec.matrix.org/v1.10/client-server-api/#post_matrixmediav1create
    const res = await this.bot.doRequest('POST', '/_matrix/media/v1/create');
    const mxcUri = res.content_uri;
    (async () => {
      console.log('[MatrixUserBotClient] uploadMediaAsync starting to fetch:', url);
      const resource = await fetch(url);
      const contentLength = Number(resource.headers.get('Content-Length') ?? resource.headers.get('content-length') ?? '0');
      const contentType = resource.headers.get('Content-Type') ?? resource.headers.get('content-type') ?? 'application/octet-stream';
      if (!contentLength || contentLength > 1024 * 1024) {
        console.log('[MatrixUserBotClient] uploadMediaAsync resource too large:', mxcUri);
        return; // give you up
      }
      const buffer = Buffer.from(await resource.arrayBuffer());

      console.log('[MatrixUserBotClient] uploadMediaAsync resource fetched, starting to upload:', mxcUri);
      const [, serverName, mediaId] = /^mxc:\/\/(.*?)\/(.+)$/.exec(mxcUri)!;
      await this.bot.doRequest('PUT', `/_matrix/media/v3/upload/${serverName}/${mediaId}`, {
        filename: contentType.replace(/\//g, '.'), // temporary, yet geek
      }, buffer, 60000, undefined, contentType);
      console.log('[MatrixUserBotClient] uploadMediaAsync uploaded:', this.bot.mxcToHttp(mxcUri));
      this.cachedMedia.set(url, mxcUri);
    })();
    return mxcUri;
  }
}

export default new MatrixUserBotClient();
