import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { fetch, Agent } from 'undici';
import { load as $ } from 'cheerio';
import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, IWhoAmI, MemoryStorageProvider } from 'matrix-bot-sdk';
import config from '../../config.json';
import { GenericClient, GenericMessage, GenericMessageEntity, MessageToEdit, MessageToSend } from './base';
import { applyMessageBridgingPrefix, prependMessageBridgingPrefix } from '.';
import { getPuppet } from 'src/database/puppet';

const escapeHTML = (str: string) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const mxcLogFile = path.resolve(__dirname, '../../matrix-log.txt');

export const mxcToUrl = async (mxcUri: string) => {
  const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;
  return `${serverRoot}/mxc/${mxcUri.replace(/^mxc:\/\//, '')}`;
};

if (fs.existsSync(mxcLogFile)) {
  fs.rmSync(mxcLogFile, { recursive: true, force: true });
}

const mxcLog = (text: string) => {
  fs.appendFileSync(mxcLogFile, `[${new Date().toISOString().replace(/T/, ' ').trim()}] ${text}\n`);
};

export class MatrixUserBotClient extends EventEmitter implements GenericClient<any, any, any> {
  public bot: MatrixClient;
  public botInfo: IWhoAmI | undefined;

  private botPuppetMap = new Map<string, MatrixClient>();

  private cachedMedia = new Map<string, string>();
  private pendingMediaUpload: Promise<void> | undefined;

  public constructor() {
    super();
    const storage = new SimpleFsStorageProvider(path.resolve(__dirname, '../../matrix-bot-storage.json'));
    const homeServer = config.matrix.server || 'matrix.org';
    const accessToken = config.matrix.token;
    this.bot = new MatrixClient('https://' + homeServer, accessToken, storage);
    this.bot.on('room.message', this.handleMessage);
    this.bot.on('room.event', (roomId, message) => {
      if (message.type === 'm.sticker') {
        this.handleMessage(roomId, message);
      }
    });
    AutojoinRoomsMixin.setupOnClient(this.bot);
    this.fetchBotInfo();

    process.on('SIGINT', async () => {
      await this.pendingMediaUpload;
      process.exit(0);
    });
  }

  public async start(): Promise<void> {
    this.bot.start();
  }

  public async stop(): Promise<void> {
    this.bot.stop();
  }

  public handleMessage = async (roomId: string, message: any) => {
    if ('mx.rkm.tietie-bot.message' in message.content) {
      return;
    }
    const transformedMessage = await this.transformMessage(message, roomId);
    if (transformedMessage.userId === this.botInfo?.user_id) return;
    this.emit(message.content['m.new_content'] ? 'edit-message' : 'message', transformedMessage);
  };

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    if (message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userDisplayName}: `);
      applyMessageBridgingPrefix(message);
    }
    const matrixEventContent: any = {
      body: message.text,
      format: message.entities ? 'org.matrix.custom.html' : undefined,
      formatted_body: message.entities ? this.renderEntitiesToHTML(message.entities, message.text) : message.text,
      msgtype: 'm.text',
      'm.relates_to': message.messageIdReplied ? { 'm.in_reply_to': { event_id: message.messageIdReplied } } : undefined,
      'mx.rkm.tietie-bot.message': message,
    };
    let mediaMessageId: string | undefined;
    if (message.media && message.media.size < 1024 * 1024) {
      const isSticker = message.media.type === 'sticker';
      const isSupportedSticker = isSticker && message.media.mimeType === 'image/jpeg';
      const matrixMediaType = isSticker && !isSupportedSticker ? 'video' : message.media.type === 'photo' ? 'image' : message.media.type;
      const displayWidth = isSticker ? (message.media.width ?? 512) / 2 : message.media.width;
      const displayHeight = isSticker ? (message.media.height ?? 512) / 2 : message.media.height;
      const mediaEvent: any = {
        body: '',
        msgtype: 'm.' + matrixMediaType,
        'mx.rkm.tietie-bot.message': message,
        url: await this.getMxcUriAndUpload(message.media.url!),
        info: { h: displayHeight, w: displayWidth, mimetype: message.media.mimeType!, size: message.media.size! },
      }
      const matrixEventType = matrixMediaType === 'sticker' ? 'm.sticker' : 'm.room.message';
      mediaMessageId = await this.bot.sendEvent(message.chatId, matrixEventType, mediaEvent);
    }
    const messageId = await this.bot.sendEvent(message.chatId, 'm.room.message', matrixEventContent);
    return {
      ...message,
      clientName: 'matrix',
      messageId,
      mediaMessageId,
      userId: this.botInfo!.user_id,
      userHandle: this.botInfo!.user_id,
      userDisplayName: this.botInfo!.user_id,
      platformMessage: { id: messageId, content: message.text },
      unixDate: Math.floor(Date.now() / 1000),
    };
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    if (message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage?.userDisplayName}: `);
      applyMessageBridgingPrefix(message);
    }
    if (message.media && message.mediaMessageId) {
      const isSticker = message.media.type === 'sticker';
      const isSupportedSticker = isSticker && message.media.mimeType === 'image/jpeg';
      const matrixMediaType = isSticker && !isSupportedSticker ? 'video' : message.media.type === 'photo' ? 'image' : message.media.type;
      const displayWidth = isSticker ? (message.media.width ?? 512) / 2 : message.media.width;
      const displayHeight = isSticker ? (message.media.height ?? 512) / 2 : message.media.height;
      await this.bot.sendEvent(message.chatId, 'm.room.message', {
        body: '[已编辑媒体]',
        msgtype: 'm.' + matrixMediaType,
        'mx.rkm.tietie-bot.message': message,
        'm.new_content': {
          body: '[已编辑媒体]',
          msgtype: 'm.' + matrixMediaType,
          url: await this.getMxcUriAndUpload(message.media.url!),
          info: { h: displayHeight, w: displayWidth, mimetype: message.media.mimeType!, size: message.media.size! },
        },
        'm.relates_to': { rel_type: 'm.replace', event_id: message.mediaMessageId },
      });
    }
    // MSC2676
    await this.bot.sendEvent(message.chatId, 'm.room.message', {
      body: `* ${message.text}`,
      msgtype: 'm.text',
      'm.new_content': {
        body: message.text,
        format: message.entities ? 'org.matrix.custom.html' : undefined,
        formatted_body: message.entities ? this.renderEntitiesToHTML(message.entities, message.text) : message.text,
        msgtype: 'm.text',
      },
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
      url: mxcToUrl(message.content.url),
      mimeType: message.content.info?.mimetype,
      size: message.content.info?.size,
    } : undefined;

    const repliedMessageId = message.content['m.relates_to']?.['m.in_reply_to']?.event_id;
    const repliedMessage = repliedMessageId && await this.bot.getEvent(roomId, repliedMessageId).catch(console.error);
    const senderUser = await this.bot.getUserProfile(message.sender).catch(console.error);
    const repliedUser = repliedMessage && await this.bot.getUserProfile(repliedMessage.sender).catch(console.error);
    return {
      clientName: 'matrix',
      text: editedContent ? getBody(editedContent) : getBody(message.content),
      userId: message.sender,
      userHandle: message.sender.match(/\w+/)[0],
      userDisplayName: senderUser?.displayname,
      userLink: `https://matrix.to/#/${message.sender}`,
      chatId: roomId,
      messageId: editedContent ? message.content['m.relates_to'].event_id : message.event_id,
      media,
      messageIdReplied: repliedMessageId,
      messageReplied: repliedMessage?.content?.['mx.rkm.tietie-bot.message'],
      userIdReplied: repliedMessage?.sender,
      userNameReplied: repliedMessageId && repliedUser?.displayname,
      platformMessage: message,
      unixDate: Math.floor(message.origin_server_ts / 1000),
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
    mxcLog(`Fetching MXC URI for ${url}`);
    const mxcUriPromise = this.bot.doRequest('POST', '/_matrix/media/v1/create')
      .then(res => {
        const mxcUri = res.content_uri;
        mxcLog(`Fetched MXC URI for ${url}: ${mxcUri}`);
        return mxcUri;
      });

    this.pendingMediaUpload = Promise.race([(async () => {
      const mxcUri = await mxcUriPromise;
      await this.uploadToMxcUri(mxcUri, url);
    })(), new Promise<void>(r => setTimeout(r, 60000))]);

    // ...and also be awaited alone
    return await mxcUriPromise;
  }

  private async uploadToMxcUri(mxcUri: string, url: string) {
    mxcLog(`Uploading to MXC URI ${mxcUri}`);
    while (true) {
      try {
        const resource = await fetch(url, {
          dispatcher: new Agent({ connect: { rejectUnauthorized: false } }),
        });
        const contentType = resource.headers.get('Content-Type') ?? resource.headers.get('content-type') ?? 'application/octet-stream';
        const buffer = Buffer.from(await resource.arrayBuffer());
        console.warn('[MatrixUserBotClient] Uploading to Matrix:', mxcUri);
        const [, serverName, mediaId] = /^mxc:\/\/(.*?)\/(.+)$/.exec(mxcUri)!;
        await this.bot.doRequest('PUT', `/_matrix/media/v3/upload/${serverName}/${mediaId}`, {
          filename: contentType.replace(/\//g, '.'), // temporary, yet geek
        }, buffer, 60000, undefined, contentType);
        this.cachedMedia.set(url, mxcUri);
        this.pendingMediaUpload = undefined;
        mxcLog(`Uploaded to MXC URI ${mxcUri}`);
        break;
      } catch (e) {
        mxcLog(`Failed to upload to MXC URI ${mxcUri} for ${url}, scheduling retry: ${util.inspect(e)}`);
        await new Promise<void>(r => setTimeout(r, 60000));
      }
    }
  }

  public async flushMedia(mxcUri: string) {
    if (!mxcUri) return;
    const [, serverName, mediaId] = /^mxc:\/\/(.*?)\/(.+)$/.exec(mxcUri)!;
    await this.bot.doRequest('PUT', `/_matrix/media/v3/upload/${serverName}/${mediaId}`, {
      filename: 'invalid',
    }, Buffer.from('Resource failed to upload'), 60000, undefined, 'text/plain');
  }

  private renderEntitiesToHTML(entities: GenericMessageEntity[], text: string): string {
    const newline = /\n/g;
    while (newline.exec(text)) {
      entities.push({ type: 'newline' as any, offset: newline.lastIndex, length: 0 });
    }
    const tagsReversed = entities.map((e) => ((e.type as any) === 'newline' ? [e.offset] : [e.offset, e.offset + e.length]).map((position) => {
      const tagName = ({ bold: 'strong', italic: 'em', strikethrough: 'del', underline: 'u', mention: 'a', link: 'a', newline: 'br' } as any)[e.type] || e.type;
      const tag = position === e.offset ? `<${tagName}${e.url ? ` href="${e.url.replace(/"/g, '&quot;')}"` : ''}>` : `</${tagName}>`;
      return { tag, position };
    })).flat().sort((a, b) => b.position - a.position);

    const buffer = Buffer.from(text, 'utf16le');
    const stack: string[] = [];
    let lastPosition = buffer.length / 2;
    for (const { tag, position } of tagsReversed) {
      stack.push(escapeHTML(buffer.subarray(position * 2, lastPosition * 2).toString('utf16le')));
      stack.push(tag);
      lastPosition = position;
    }
    stack.push(escapeHTML(buffer.subarray(0, lastPosition * 2).toString('utf16le')));
    return stack.reverse().join('');
  }
}

export default new MatrixUserBotClient();
