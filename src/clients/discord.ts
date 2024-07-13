import crypto from 'crypto';
import * as dismoji from 'discord-emoji';
import { EventEmitter } from 'events';
// @ts-ignore
import discord from 'discord-user-bots';

import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';
import config from '../../config.json';
import { prependMessageText } from '.';

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
    if (!config.discordUserToken) {
      return;
    }
    this.bot = new discord.Client(config.discordUserToken);
    this.botReady = new Promise(r => this.bot.on.ready = r);

    this.bot.on.message_create = (message: any) => {
      const transformedMessage = this.transformMessage(message);
      if (message.author?.username === config.discordUsername) return;
      this.emit('message', transformedMessage);
    };
    this.bot.on.message_edit = (message: any) => {
      const transformedMessage = this.transformMessage(message);
      if (message.author?.username === config.discordUsername) return;
      this.emit(message.interaction ? 'message' : 'edit-message', transformedMessage);
    };
    this.bot.on.heartbeat_received = () => {
      if (this.bot._heartbeatStopTimeout) clearTimeout(this.bot._heartbeatStopTimeout);
      this.bot._heartbeatStopTimeout = setTimeout(() => {
        this.start();
      }, 60000);
    };
    this.bot.on.reply = (message: any) => {
      const transformedMessage = this.transformMessage(message);
      if (message.author?.username === config.discordUsername) return;
      this.emit('message', transformedMessage);
    };
    await this.botReady;
  }

  public async stop(): Promise<void> {
    this.bot.close();
    this.bot = undefined;
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    if (message.rawUserDisplayName) {
      prependMessageText(message, `${message.rawUserHandle}: `); // use handles for discord only
    }
    const messageSent = await this.bot.send(message.chatId, {
      content: `${message.text} ${message.media?.url ?? ''}`.trim(),
      reply: message.messageIdReplied ?? null,
      ...message.rawMessageExtra ?? {},
    });
    return this.transformMessage(messageSent);
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    if (message.rawUserDisplayName) {
      prependMessageText(message, `${message.rawUserHandle}: `); // use handles for discord only
    }
    await this.bot.edit(message.messageId, message.chatId, `${message.text} ${message.media?.url ?? ''}`.trim());
  }

  private transformMessage(message: any): GenericMessage {
    const singleAttachment = message.attachments?.length === 1 ? message.attachments[0] : undefined;
    const hasMultiAttachments = message.attachments?.length > 1;
    const media = singleAttachment ? {
      type: ({
        image: 'photo',
        video: 'video',
      } as any)[singleAttachment.content_type?.split('/')[0]] || 'file',
      url: singleAttachment.url,
      mimeType: singleAttachment.content_type,
      size: singleAttachment.size,
    } : undefined;
    return {
      clientName: 'discord',
      text: convertDiscordMessage(message.content ?? '') + (hasMultiAttachments ? ' ' + message.attachments.map((a: any) => a.url).join(' ') : ''),
      userId: message.author?.id,
      userHandle: message.author?.global_name ?? message.author?.username,
      userDisplayName: message.author?.global_name ?? message.author?.username,
      chatId: message.channel_id,
      messageId: message.id,
      media,
      messageIdReplied: message.referenced_message?.id,
      messageReplied: message.referenced_message && this.transformMessage(message.referenced_message),
      userIdReplied: message.referenced_message?.author?.id,
      rawMessage: message,
      unixDate: new Date(message.timestamp).getTime() / 1000,
      isServiceMessage: !!message.author?.bot,
    }
  }

  public async callOtherBotCommand(text: string, chatId: string) {
    const guildId = this.bot.info.guilds.find((guild: any) => {
      return guild.channels.some((channel: any) => channel.id === chatId);
    })?.id;
    if (!guildId) return;
    const commands = await this.bot.requester.fetch_request(
      `guilds/${guildId}/application-command-index`,
      undefined, this.bot.clientData, 'GET'
    );
    const [commandName, ...args] = text.substring(1).split(/\s+/);
    const command = commands.application_commands.find((c: any) => c.name === commandName);
    if (!command) return;
    const payload = {
      type: 2,
      application_id: command.application_id,
      guild_id: guildId,
      channel_id: chatId,
      session_id: require('crypto').randomBytes(16).toString('hex'),
      data: {
        ...command,
        application_command: command,
        options: [...args],
        attachments: [],
      },
      nonce: String(Math.floor(Date.now() * 666666)),
    };
    await this.bot.call_check([]);
    await this.bot.requester.fetch_request('interactions', payload);
    return;
  }
}

export default new DiscordUserBotClient();
