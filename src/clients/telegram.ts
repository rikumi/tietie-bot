import type Context from 'telegraf/typings/context';
import type { Message, MessageEntity, TelegramEmoji, Update, User } from 'telegraf/typings/core/types/typegram'

import { EventEmitter } from 'events';
import { Telegraf } from 'telegraf';

import { GenericClient, GenericMessage, GenericMessageEntity, MessageToEdit, MessageToSend } from './base';
import config from '../../config.json';
import { setTelegramFileId } from 'src/database/tgfile';
import { prependMessageText } from '.';
import { getPuppet } from 'src/database/puppet';
import mime from 'mime-types';

export const fileIdToUrl = async (fileId: string, fileUniqueId: string | null, mimeType: string, gzipped = false) => {
  const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;
  const extension = mime.extension(mimeType);
  if (fileUniqueId) {
    try {
      await setTelegramFileId(fileUniqueId, fileId);
      return `${serverRoot}/f/${fileUniqueId}.${extension}${gzipped ? '.gz' : ''}`;
    } catch (e) {
      console.warn('[TelegramBotClient] fileIdToUrl error', e);
    }
  }
  return `${serverRoot}/f/${fileId}.${extension}${gzipped ? '.gz' : ''}`;
};

export const fileIdToTGSPreviewUrl = async (fileId: string, fileUniqueId: string | null) => {
  const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;
  if (fileUniqueId) {
    try {
      await setTelegramFileId(fileUniqueId, fileId);
      return `${serverRoot}/tgsuniq/${fileUniqueId}`;
    } catch (e) {
      console.warn('[TelegramBotClient] fileIdToTGSPreviewUrl error', e);
    }
  }
  return `${serverRoot}/tgs/${fileId}`;
};

export class TelegramBotClient extends EventEmitter implements GenericClient<Message, User, any> {
  public bot: Telegraf<Context<Update>> = new Telegraf(config.telegram.token);

  private botPuppetMap = new Map<string, Telegraf<Context<Update>>>();

  public constructor() {
    super();
    this.bot.on('message', async (ctx: Context<Update.MessageUpdate>) => {
      if (!ctx.message || ctx.message.date * 1000 < Date.now() - 10000) return;
      const transformedMessage = await this.transformMessage(ctx.message);
      if (!transformedMessage) return;
      this.emit('message', transformedMessage);
    });
    this.bot.on('edited_message', async (ctx: Context<Update.EditedMessageUpdate>) => {
      const transformedMessage = await this.transformMessage(ctx.editedMessage!);
      if (!transformedMessage) return;
      this.emit('edit-message', transformedMessage);
    });
  }

  public async start(): Promise<void> {
    this.bot.launch();
  }

  public async stop(): Promise<void> {
    this.bot.stop();
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    const bot = message.bridgedMessage?.userId ? await this.getBotForUser(message.bridgedMessage.clientName, message.bridgedMessage.userId, message.chatId) : this.bot;
    if (message.bridgedMessage?.userDisplayName && bot === this.bot) {
      prependMessageText(message, `${message.bridgedMessage.userDisplayName}: `);
    }
    const method = ({
      sticker: 'sendSticker',
      photo: 'sendPhoto',
      video: 'sendVideo',
      file: 'sendDocument',
      default: 'sendMessage',
    } as const)[message.media?.type ?? 'default'] ?? 'sendMessage';

    const entities = message.entities?.map(entity => ({
      type: entity.type.replace(/^(link|mention)$/, 'text_link'),
      offset: entity.offset,
      length: entity.length,
      url: entity.url,
      language: entity.codeLanguage,
    }));
    const options = {
      reply_to_message_id: message.messageIdReplied ? Number(message.messageIdReplied) : undefined,
      caption: message.media ? message.text : undefined,
      [message.media ? 'caption_entities' : 'entities']: entities,
      disable_notification: true,
      ...message.platformMessageExtra ?? {},
    };
    const firstMessageContent = message.media?.telegramFileId ?? message.media?.url ?? message.text;

    const messageSent = await bot.telegram[method](message.chatId, firstMessageContent, options);
    if (message.media?.type === 'sticker') {
      const secondMessage = await bot.telegram.sendMessage(message.chatId, message.text, options);
      return {
        ...message,
        ...await this.transformMessage(messageSent),
        mediaMessageId: String(messageSent.message_id),
        messageId: String(secondMessage.message_id),
      };
    }
    return {
      ...message,
      ...await this.transformMessage(messageSent),
    };
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    if (message.bridgedMessage?.userDisplayName) {
      prependMessageText(message, `${message.bridgedMessage.userDisplayName}: `);
    }
    const entities = message.entities?.map(entity => ({
      type: entity.type.replace(/^(link|mention)$/, 'text_link') as any,
      offset: entity.offset,
      length: entity.length,
      url: entity.url,
    }));
    if (!message.media) {
      await this.bot.telegram.editMessageText(message.chatId, Number(message.messageId), undefined, message.text, { entities });
      return;
    }
    if (message.media.type === 'sticker') {
      return;
    }
    await this.bot.telegram.editMessageMedia(message.chatId, Number(message.messageId), undefined, {
      type: message.media.type === 'file' ? 'document' : message.media.type,
      media: message.media.url!,
      caption: message.text,
      caption_entities: entities,
    });
  }

  public async reactToMessage(chatId: string, messageId: string, emoji: string) {
    await this.bot.telegram.setMessageReaction(chatId, Number(messageId), [{
      type: 'emoji',
      emoji: emoji as TelegramEmoji,
    }]);
  }

  public async setCommandList(commandList: { command: string; description: string; }[]): Promise<void> {
    await this.bot.telegram.setMyCommands(commandList);
  }

  public async transformMessage(message: Message): Promise<GenericMessage> {
    const text = 'text' in message && message.text || 'caption' in message && message.caption || '';
    const result: GenericMessage = {
      clientName: 'telegram',
      text,
      userId: String(message.from!.id),
      userHandle: this.getUserHandle(message.from),
      userDisplayName: this.getUserDisplayName(message.from),
      userLink: this.getUserLink(message.from),
      chatId: String(message.chat.id),
      messageId: String(message.message_id),
      messageIdReplied: 'reply_to_message' in message && String(message.reply_to_message?.message_id ?? '') || undefined,
      messageReplied: 'reply_to_message' in message && await this.transformMessage(message.reply_to_message!) || undefined,
      userIdReplied: 'reply_to_message' in message && String(message.reply_to_message?.from?.id ?? '') || undefined,
      userNameReplied: 'reply_to_message' in message && this.getUserDisplayName(message.reply_to_message?.from) || undefined,
      userLinkReplied: 'reply_to_message' in message && this.getUserLink(message.reply_to_message?.from) || undefined,
      platformMessage: message,
      unixDate: message.date,
      entities: 'entities' in message && message.entities?.map((e) => this.transformEntity(e, text)).filter(Boolean) as any[] || undefined
    };
    if ('forward_origin' in message || 'forward_from' in message) {
      prependMessageText(result, `[转发自 ${this.transformForwardOrigin(message)}] `);
    }
    const sticker = 'sticker' in message ? message.sticker : undefined;
    const photo = 'photo' in message ? message.photo.slice(-1)[0] : undefined;
    const video = 'video' in message ? message.video : undefined;
    const audio = 'audio' in message ? message.audio : undefined;
    const file = 'document' in message ? message.document : undefined;
    const fileId = (video ?? photo ?? audio ?? sticker ?? file)?.file_id;
    const fileUniqueId = (video ?? photo ?? audio ?? sticker ?? file)?.file_unique_id;

    if (!fileId) {
      return result;
    }
    if (sticker?.is_animated) {
      // Special processing of TGS (Lottie) animated stickers
      const url = await fileIdToTGSPreviewUrl(fileId, fileUniqueId!);
      prependMessageText(result, `[${sticker.emoji ?? '🖼️'} TGS 贴纸] ${url} `);
    } else if (sticker) {
      // Static or WEBM stickers
      prependMessageText(result, `[${sticker.emoji ?? '🖼️'} 贴纸] `);
      result.media = {
        type: 'sticker',
        mimeType: sticker?.is_video ? 'video/webm' : 'image/jpeg',
        size: sticker.file_size ?? 0,
        url: '',
        width: sticker.width,
        height: sticker.height,
        telegramFileId: sticker.file_id,
      };
      result.media.url = await fileIdToUrl(fileId, fileUniqueId!, result.media?.mimeType);
    } else if (video) {
      result.media = {
        type: 'video',
        mimeType: video.mime_type ?? 'video/mp4',
        size: video.file_size ?? 0,
        url: '',
        width: video.width,
        height: video.height,
      };
      result.media.url = await fileIdToUrl(fileId, fileUniqueId!, result.media?.mimeType);
    } else if (photo) {
      const mediaUrl = await fileIdToUrl(fileId, fileUniqueId!, 'image/jpeg');
      if ('has_media_spoiler' in message && message.has_media_spoiler) {
        prependMessageText(result, `[带有内容警告的媒体] ${mediaUrl} `);
      } else {
        result.media = {
          type: 'photo',
          mimeType: 'image/jpeg',
          size: photo.file_size ?? 0,
          url: mediaUrl,
          width: photo.width,
          height: photo.height,
        };
      }
    } else {
      prependMessageText(result, '[文件] ');
      result.media = {
        type: 'file',
        mimeType: (file ?? audio)?.mime_type ?? 'application/octet-stream',
        size: (file ?? audio)?.file_size ?? 0,
        url: '',
      };
      result.media.url = await fileIdToUrl(fileId, fileUniqueId!, result.media.mimeType);
    }
    return result;
  }

  private getUserHandle(user: User | undefined): string {
    return user?.username ?? this.getUserDisplayName(user);
  }

  private getUserDisplayName(user: User | undefined): string {
    return ((user?.first_name ?? '') + ' ' + (user?.last_name ?? '')).trim();
  }

  private getUserLink(user: User | undefined): string | undefined {
    if (!user) return;
    const { username, id } = user;
    return username ? `https://t.me/${username}` : `tg://user?id=${id}`;
  }

  /**
   * Oh my god Durov see what you've done
   */
  private transformForwardOrigin(message: any) {
    const o = message.forward_origin;
    const originName = o?.sender_user_name || o?.sender_chat?.title || o?.chat?.title || message.forward_sender_name;
    const originChat = o?.sender_user || o?.chat || o?.sender_chat || message.forward_from;
    return originName || this.getUserDisplayName(originChat) || '未知会话';
  }

  private transformEntity(entity: MessageEntity, text: string): GenericMessageEntity | undefined {
    const { type, offset, length } = entity;
    if (['bold', 'italic', 'underline', 'strikethrough', 'blockquote', 'code', 'pre'].includes(type)) {
      return { type: type as any, offset, length };
    }
    if (type === 'spoiler') {
      return { type: 'strikethrough', offset, length };
    }
    if (type === 'text_link') {
      return { type: 'link', offset, length, url: entity.url };
    }
    if (type === 'text_mention') {
      return { type: 'mention', offset, length, url: this.getUserLink(entity.user) };
    }
    if (type === 'expandable_blockquote' as any) {
      return { type: 'blockquote', offset, length };
    }
    const substring = Buffer.from(text, 'utf16le').subarray(offset * 2, (offset + length) * 2).toString('utf16le');
    if (type === 'url') {
      return { type: 'link', offset, length, url: substring };
    }
    if (type === 'mention') {
      return { type: 'mention', offset, length, url: `https://t.me/${substring.replace(/^@/, '')}` };
    }
  }

  private async getBotForUser(fromClient: string, fromUserId: string, chatId: string) {
    const puppetBotToken = await getPuppet(fromClient, fromUserId, 'telegram');
    if (!puppetBotToken) {
      return this.bot;
    }
    const key = `${fromUserId}:${chatId}`;
    if (!this.botPuppetMap.has(key)) {
      const bot = new Telegraf(puppetBotToken);
      try {
        const chatInfo = await bot.telegram.getChat(chatId);
        console.error('[TelegramBotClient] getBotForUser success', chatInfo);
        this.botPuppetMap.set(key, bot);
      } catch (e) {
        console.error('[TelegramBotClient] getBotForUser error', e);
        return this.bot;
      }
    }
    return this.botPuppetMap.get(key)!;
  }
}

export default new TelegramBotClient();
