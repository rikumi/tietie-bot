import type Context from 'telegraf/typings/context';
import type { ChatMemberUpdated, Message, MessageEntity, MessageReactionUpdated, TelegramEmoji, Update, User } from 'telegraf/typings/core/types/typegram'

import { EventEmitter } from 'events';
import { Telegraf } from 'telegraf';

import { GenericClient, GenericMessage, GenericMessageEntity, GenericMessageReaction, MessageToEdit, MessageToSend } from './base';
import * as autoreact from '../commands/autoreact';
import config from '../../config.json';
import { setTelegramFileId } from 'src/database/tgfile';
import defaultClientSet, { applyMessageBridgingPrefix, prependMessageBridgingPrefix } from '.';
import mime from 'mime-types';
import { TELEGRAM_EMOJI } from '../commands/autoreact';

const MEDIA_SCALING = 1 / 3;
const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;

export const fileIdToUrl = async (fileId: string, fileUniqueId: string | null, mimeType: string, gzipped = false) => {
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

export const userIdToAvatarUrl = (userId: number) => {
  return `${serverRoot}/tavatar/${userId}`;
};

export const fileIdToTGSPreviewUrl = async (fileId: string, fileUniqueId: string | null) => {
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

  private messageReactionStackMap = new Map<string, string[]>;

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
    this.bot.on('chat_member', async (ctx: Context<Update.ChatMemberUpdate>) => {
      const { old_chat_member: oldMember, new_chat_member: newMember } = ctx.chatMember;
      const getTag = (member: any) => member.tag || member.custom_title || '(空)';
      if (getTag(oldMember) !== getTag(newMember)) {
        this.handleTagChange(ctx.chatMember, getTag(newMember));
      }
    });
    this.bot.on('message_reaction', async (ctx: Context<Update.MessageReactionUpdate>) => {
      this.handleReactionChange(ctx.messageReaction);
    });
  }

  public async start(): Promise<void> {
    this.bot.launch({
      allowedUpdates: ['message', 'edited_message', 'chat_member', 'poll', 'message_reaction'],
    });
  }

  public async stop(): Promise<void> {
    this.bot.stop();
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    try {
      if (message.bridgedMessage?.userDisplayName) {
        prependMessageBridgingPrefix(message, `${message.bridgedMessage.userDisplayName}: `);
        applyMessageBridgingPrefix(message);
      }
      const method = ({
        sticker: 'sendSticker',
        photo: message.media?.size < 5000000 ? 'sendPhoto' : 'sendDocument',
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

      const messageSent = await this.bot.telegram[method](message.chatId, firstMessageContent, options);
      if (message.media?.type === 'sticker') {
        const secondMessage = await this.bot.telegram.sendMessage(message.chatId, message.text, options);
        return {
          ...message,
          ...await this.transformMessage(messageSent),
          mediaMessageId: String(messageSent.message_id),
          messageId: String(secondMessage.message_id),
        };
      }
      const result: GenericMessage = {
        ...message,
        ...await this.transformMessage(messageSent),
      };
      // Someone doubts if messages sent by bot itself can be auto-reacted, so let's support it here because why not.
      autoreact.handleMessage(result);
      return result;
    } catch (e) {
      console.error('TelegramBotClient Error sending message', e);
      throw e;
    }
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    if (message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userDisplayName}: `);
      applyMessageBridgingPrefix(message);
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

  public async applyReaction(reaction: GenericMessageReaction) {
    if (reaction.isRetracted) {
      return await this.retractReaction(reaction);
    }
    const { chatId, messageId, reaction: emoji } = reaction;
    const key = `${chatId}|${messageId}`;
    const existing = this.messageReactionStackMap.get(key) ?? [];
    this.messageReactionStackMap.set(key, [...existing, emoji]);
    // some poor handling of cache eviction
    setTimeout(() => this.messageReactionStackMap.delete(key), 1000 * 60 * 60);

    await this.bot.telegram.setMessageReaction(chatId, Number(messageId), [{
      type: 'emoji',
      emoji: TELEGRAM_EMOJI.includes(emoji) ? emoji as TelegramEmoji : '👀',
    }]);
  }

  public async retractReaction(reaction: GenericMessageReaction) {
    const { chatId, messageId, reaction: emoji } = reaction;
    const key = `${chatId}|${messageId}`;
    const existing = this.messageReactionStackMap.get(key) ?? [];
    const newEmojiList = existing.filter(e => e !== emoji);
    const newLastEmoji = newEmojiList.slice(-1)[0];

    if (newLastEmoji) {
      this.messageReactionStackMap.set(key, newEmojiList);
    } else {
      this.messageReactionStackMap.delete(key);
    }

    await this.bot.telegram.setMessageReaction(chatId, Number(messageId), newLastEmoji ? [{
      type: 'emoji',
      emoji: TELEGRAM_EMOJI.includes(newLastEmoji) ? newLastEmoji as TelegramEmoji : '👀',
    }] : []);
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
      userAvatarUrl: this.getUserAvatarUrl(message.from),
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
    // spoilers has been transformed to links, now replace them per-character with U+2588 Full Block's
    if ('entities' in message && message.entities?.some(e => e.type === 'spoiler')) {
      const spoilerEntities = message.entities.filter(e => e.type === 'spoiler');
      const textBuffer = Buffer.from(text, 'utf16le');
      for (const spoiler of spoilerEntities) {
        Array(spoiler.length).fill(0).map((_, index) => {
          textBuffer.write('\u2588', (spoiler.offset + index) * 2, 2, 'utf16le');
        });
      }
      result.text = textBuffer.toString('utf16le');
    }
    if ('poll' in message) {
      const isAnonymous = message.poll.is_anonymous;
      result.text = `[${isAnonymous ? '匿名投票' : '投票'}] ${
        message.poll.question ?? ''
      }\n\n${
        message.poll.description ?? ''
      }\n\n${
        message.poll.options.map(option => `- ${option.text}${isAnonymous ? '' : ` (${option.voter_count} 人投票)`}`).join('\n')
      }\n\n${
        message.poll.total_voter_count
      } 人已投票`;
    }
    if ('entities' in message && message.entities?.some(e => e.type === 'custom_emoji')) {
      const prefix = '[点击渲染自定义表情]';
      const url = `${serverRoot}/render/${Buffer.from(JSON.stringify(message)).toString('base64')}`;
      prependMessageBridgingPrefix(result, `${prefix} `);
      message.entities ??= [];
      message.entities.unshift({ type: 'link', offset: 0, length: Buffer.from(prefix, 'utf16le').length, url });
    }
    if ('forward_origin' in message || 'forward_from' in message) {
      prependMessageBridgingPrefix(result, `[转发自 ${this.transformForwardOrigin(message)}] `);
    }
    const sticker = 'sticker' in message ? message.sticker : undefined;
    const photo = 'photo' in message ? message.photo.slice(-1)[0] : undefined;
    const video = 'video' in message ? message.video
      : 'animation' in message ? message.animation
      : undefined;
    const audio = 'audio' in message ? message.audio : undefined;
    const file = 'document' in message ? message.document : undefined;
    const anyAttachment = video ?? photo ?? audio ?? sticker ?? file;
    const fileId = anyAttachment?.file_id;
    const fileUniqueId = anyAttachment?.file_unique_id;

    const thumbnail = anyAttachment && ('thumbnail' in anyAttachment) ? anyAttachment.thumbnail : undefined;
    const thumbnailResult = thumbnail && {
      url: '',
      width: Math.round(thumbnail.width * MEDIA_SCALING),
      height: Math.round(thumbnail.height * MEDIA_SCALING),
      size: thumbnail.file_size,
      mimeType: 'image/jpeg',
    };
    if (thumbnail) {
      thumbnailResult!.url = await fileIdToUrl(thumbnail.file_id, thumbnail.file_unique_id, thumbnailResult!.mimeType);
    }

    if (!fileId) {
      return result;
    }
    if (sticker?.is_animated) {
      // Special processing of TGS (Lottie) animated stickers
      const url = await fileIdToTGSPreviewUrl(fileId, fileUniqueId!);
      prependMessageBridgingPrefix(result, `[${sticker.emoji ?? '🖼️'} TGS 贴纸] ${url} `);
    } else if (sticker) {
      // Static or WEBM stickers
      prependMessageBridgingPrefix(result, `[${sticker.emoji ?? '🖼️'} 贴纸] `);
      result.media = {
        type: 'sticker',
        mimeType: sticker?.is_video ? 'video/webm' : 'image/jpeg',
        size: sticker.file_size ?? 0,
        url: '',
        thumbnail: thumbnailResult,
        width: Math.round(sticker.width * MEDIA_SCALING),
        height: Math.round(sticker.height * MEDIA_SCALING),
        telegramFileId: sticker.file_id,
      };
      result.media.url = await fileIdToUrl(fileId, fileUniqueId!, result.media?.mimeType);
    } else if (video) {
      prependMessageBridgingPrefix(result, '[视频] ');
      result.media = {
        type: 'video',
        mimeType: video.mime_type ?? 'video/mp4',
        size: video.file_size ?? 0,
        url: '',
        thumbnail: thumbnailResult,
        width: Math.round(video.width * MEDIA_SCALING),
        height: Math.round(video.height * MEDIA_SCALING),
      };
      result.media.url = await fileIdToUrl(fileId, fileUniqueId!, result.media?.mimeType);
    } else if (photo) {
      const mediaUrl = await fileIdToUrl(fileId, fileUniqueId!, 'image/jpeg');
      if ('has_media_spoiler' in message && message.has_media_spoiler) {
        prependMessageBridgingPrefix(result, `[带有内容警告的媒体] ${mediaUrl} `);
      } else {
        prependMessageBridgingPrefix(result, '[图片] ');
        result.media = {
          type: 'photo',
          mimeType: 'image/jpeg',
          size: photo.file_size ?? 0,
          url: mediaUrl,
          thumbnail: thumbnailResult,
          width: Math.round(photo.width * MEDIA_SCALING),
          height: Math.round(photo.height * MEDIA_SCALING),
        };
      }
    } else {
      prependMessageBridgingPrefix(result, '[文件] ');
      result.media = {
        type: 'file',
        mimeType: (file ?? audio)?.mime_type ?? 'application/octet-stream',
        size: (file ?? audio)?.file_size ?? 0,
        url: '',
        thumbnail: thumbnailResult,
      };
      result.media!.url = await fileIdToUrl(fileId, fileUniqueId!, result.media!.mimeType);
    }
    return result;
  }

  private handleTagChange(chatMember: ChatMemberUpdated, newTag: string) {
    defaultClientSet.sendBotMessage({
      clientName: 'telegram',
      chatId: String(chatMember.chat.id),
      text: `${this.getUserDisplayName(chatMember.old_chat_member.user)} 的头衔已变更为 ${newTag}。(/tag)`,
    });
  }

  private handleReactionChange(reactions: MessageReactionUpdated) {
    const oldReactions = reactions.old_reaction.filter(r => !reactions.new_reaction.includes(r));
    const newReactions = reactions.new_reaction.filter(r => !reactions.old_reaction.includes(r));
    for (const reaction of oldReactions) {
      this.emit('reaction', {
        clientName: 'telegram',
        chatId: String(reactions.chat.id),
        userId: String(reactions.user?.id),
        messageId: String(reactions.message_id),
        reaction: reaction.type === 'emoji' ? reaction.emoji : '👀',
        isRetracted: true,
      } satisfies GenericMessageReaction);
    }
    for (const reaction of newReactions) {
      this.emit('reaction', {
        clientName: 'telegram',
        chatId: String(reactions.chat.id),
        userId: String(reactions.user?.id),
        messageId: String(reactions.message_id),
        userDisplayName: this.getUserDisplayName(reactions.user),
        reaction: reaction.type === 'emoji' ? reaction.emoji : '👀',
        customReactionUrl: reaction.type === 'custom_emoji' ? `${serverRoot}/tgmoji/${reaction.custom_emoji_id}` : undefined
      } satisfies GenericMessageReaction);
    }
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

  private getUserAvatarUrl(user: User | undefined): string | undefined {
    if (!user) return;
    return userIdToAvatarUrl(user.id);
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
    if (type === 'text_link') {
      return { type: 'link', offset, length, url: entity.url };
    }
    if (type === 'text_mention') {
      return { type: 'mention', offset, length, url: this.getUserLink(entity.user) };
    }
    if (type === 'custom_emoji') {
      return { type: 'image', offset, length, url: `${serverRoot}/tgmoji/${entity.custom_emoji_id}`, imageWidth: 16, imageHeight: 16 };
    }
    if (type === 'expandable_blockquote' as any) {
      return { type: 'blockquote', offset, length };
    }
    const substring = Buffer.from(text, 'utf16le').subarray(offset * 2, (offset + length) * 2).toString('utf16le');
    if (type === 'url') {
      return { type: 'link', offset, length, url: substring };
    }
    if (type === 'spoiler') {
      return { type: 'link', offset, length, url: `https://httpbin.org/base64/${encodeURIComponent(Buffer.from(text).toString('base64'))}` };
    }
    if (type === 'mention') {
      return { type: 'mention', offset, length, url: `https://t.me/${substring.replace(/^@/, '')}` };
    }
  }
}

export default new TelegramBotClient();
