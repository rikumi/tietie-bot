import { EventEmitter } from 'events';
import path from 'path';
import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin, IWhoAmI } from 'matrix-bot-sdk';
import config from '../../config.json';
import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';

export class MatrixUserBotClient extends EventEmitter implements GenericClient<any, any, any> {
  public bot: MatrixClient;
  public botInfo: IWhoAmI | undefined;

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
    const messageText = `${message.text}\n${message.mediaUrl ?? ''}`.trim();
    const sentMessageIdPromise = (() => {
      if (message.messageIdReplied) {
        return this.bot.replyText(message.chatId, { event_id: message.messageIdReplied }, messageText);
      } else {
        return this.bot.sendText(message.chatId, messageText);
      }
    })();
    const id = await sentMessageIdPromise;
    return {
      ...message,
      clientName: 'matrix',
      messageId: id,
      userId: this.botInfo!.user_id,
      userName: this.botInfo!.user_id,
      rawMessage: { id, content: message.text },
      rawUser: this.botInfo,
      unixDate: Date.now() / 1000,
    };
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    console.warn('[MatrixUserBotClient] editMessage is currently not supported!', message);
  }

  private async transformMessage(message: any, roomId: string): Promise<GenericMessage> {
    const attachmentType = message.content.info?.mimetype?.split('/')[0];
    const edited = message.content['m.new_content'];
    return {
      clientName: 'matrix',
      text: edited ? edited.body : message.content.body,
      userId: message.sender,
      userName: (await this.bot.getUserProfile(message.sender)).displayname,
      chatId: roomId,
      messageId: edited ? message.content['m.relates_to'].event_id : message.event_id,
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
}

export default new MatrixUserBotClient();
