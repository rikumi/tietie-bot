import crypto from 'crypto';
import * as dismoji from 'discord-emoji';
import { EventEmitter } from 'events';
// @ts-ignore
import discord from 'discord-user-bots';

import { GenericClient, GenericMessage, MessageToSend } from './base';
import config from '../../config.json';

const convertDiscordMessage = (text: string) => {
  const rtlTextRegex = /([\u04c7-\u0591\u05D0-\u05EA\u05F0-\u05F4\u0600-\u06FF\uFE70-\uFEFF]+)/g;
  if (rtlTextRegex.test(text)) {
    text = text.replace(rtlTextRegex, '(RTL: \u202B$1\u202C)')
  }
  return text.replace(/\\/g, '').replace(/:(\w+):/g, (match, emojiName) => {
    for (const category of Object.keys(dismoji)) {
      const emoji = (dismoji as any)[category][emojiName];
      if (typeof emoji === 'string') {
        return emoji;
      }
    }
    return match;
  });
};

if (!crypto.getRandomValues) {
  const getRandomValues = (arr: any[]) => {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
  crypto.getRandomValues = getRandomValues as any; // usable
}

export class DiscordUserBotClient extends EventEmitter implements GenericClient {
  public bot: discord.Client | undefined;
  public botReady: Promise<void> | undefined;

  public async start(): Promise<void> {
    if (this.bot) {
      this.stop();
    }
    this.bot = new discord.Client(config.discordUserToken);
    this.botReady = new Promise(r => this.bot.on.ready = r);

    this.bot.on.message_create = (message: any) => {
      const transformedMessage = this.transformMessage(message);
      if (transformedMessage.userName === config.discordUsername) return;
      this.emit('message', transformedMessage);
    };
    this.bot.on.heartbeat_received = () => {
      if (this.bot._heartbeatStopTimeout) clearTimeout(this.bot._heartbeatStopTimeout);
      this.bot._heartbeatStopTimeout = setTimeout(() => {
        console.log('_heartbeatStopTimeout');
        this.start();
      }, 60000);
    };
    this.bot.on.message_edit = (message: any) => {
      const transformedMessage = this.transformMessage(message);
      if (transformedMessage.userName === config.discordUsername) return;
      this.emit('edit-message', transformedMessage);
    };
  }

  public async stop(): Promise<void> {
    this.bot.close();
    this.bot = undefined;
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    const messageSent = await this.bot.send(message.chatId, {
      content: `${message.text}\n${message.mediaUrl ?? ''}`.trim(),
      reply: message.messageIdReplied ?? null,
      ...message.rawMessageExtra ?? {},
    });
    return this.transformMessage(messageSent);
  }

  public async editMessage(message: GenericMessage): Promise<void> {
    await this.bot.edit(message.messageId, message.chatId, `${message.text}\n${message.mediaUrl ?? ''}`.trim());
  }

  private transformMessage(message: any): GenericMessage {
    const singleAttachment = message.attachments?.length === 1 ? message.attachments[0] : undefined;
    const hasMultiAttachments = message.attachments?.length > 1;
    return {
      clientName: 'discord',
      text: convertDiscordMessage(message.content) + (hasMultiAttachments ? '\n' + message.attachments.map((a: any) => a.url).join('\n') : ''),
      userId: message.author?.id,
      userName: message.author?.username,
      chatId: message.channel_id,
      messageId: message.id,
      mediaType: singleAttachment ? ({
        image: 'photo',
        video: 'video',
      } as any)[singleAttachment.content_type?.split('/')[0]] || 'file' : undefined,
      mediaUrl: singleAttachment?.url,
      messageIdReplied: message.referenced_message?.id,
      rawMessage: message,
      rawUser: message.author!,
      rawMessageReplied: message.referenced_message!,
      unixDate: new Date(message.timestamp).getTime() / 1000,
    }
  }
}

export default new DiscordUserBotClient();
