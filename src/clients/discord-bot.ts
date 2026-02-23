import crypto from 'crypto';
import * as dismoji from 'discord-emoji';
import { EventEmitter } from 'events';
import discord, { Events, GatewayIntentBits, Interaction, Message, PermissionsBitField, Routes, TextChannel, Webhook } from 'discord.js';

import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';
import config from '../../config.json';
import { applyMessageBridgingPrefix, prependMessageBridgingPrefix } from '.';

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

export class DiscordBotClient extends EventEmitter implements GenericClient {
  public rest: discord.REST | undefined;
  public client: discord.Client | undefined;
  public webhook: discord.Webhook | undefined;
  public botReady: Promise<void> | undefined;

  private webhookForChannel = new Map<string, discord.Webhook>();

  public async start(): Promise<void> {
    if (this.client) {
      this.stop();
    }
    if (!config['discord-bot']?.token) {
      return;
    }
    this.rest = new discord.REST({ version: '10' }).setToken(config['discord-bot'].token);
    this.client = new discord.Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
    this.botReady = new Promise(r => this.client!.on(Events.ClientReady, () => r()));

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.id === this.client?.user?.id || message.webhookId) return;
      const transformedMessage = await this.transformMessage(message);
      this.emit('message', transformedMessage);
    });
    this.client.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const transformedMessage = this.transformInteraction(interaction);
      this.emit('message', transformedMessage);
    });
    this.client.login(config['discord-bot'].token);

    await this.botReady;
    console.log(`[DiscordBotClient] Started! Bot invite link: ${this.getInviteLink()}`)
  }

  public async stop(): Promise<void> {
    this.client?.destroy();
    this.client = undefined;
  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    const channel = await this.client?.channels.fetch(message.chatId);
    if (!channel) {
      throw new Error(`Channel ${message.chatId} not found`);
    }
    if (!channel.isSendable()) {
      throw new Error(`Channel ${message.chatId} is not sendable`);
    }

    const shouldUseUserSpoofing = message.bridgedMessage?.userDisplayName && (channel instanceof TextChannel);
    const sender = shouldUseUserSpoofing && await this.getWebhookForChannel(channel) || channel;

    // apply bridging prefix for non-webhook messages only
    if (sender === channel && message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userHandle}: `); // use handles for discord only
      applyMessageBridgingPrefix(message);
    }

    const messageSent = await sender.send({
      username: message.bridgedMessage?.userDisplayName,
      avatarURL: message.bridgedMessage?.userAvatarUrl,
      content: `${message.text} ${message.media?.url ?? ''}`.trim(),
      reply: message.messageIdReplied ? { messageReference: message.messageIdReplied } : undefined,
      ...message.platformMessageExtra ?? {},
    });
    return await this.transformMessage(messageSent);
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    const channel = await this.client?.channels.fetch(message.chatId);
    if (!channel) {
      throw new Error(`Channel ${message.chatId} not found`);
    }
    if (!channel.isSendable()) {
      throw new Error(`Channel ${message.chatId} is not sendable`);
    }
    const shouldUseUserSpoofing = message.bridgedMessage?.userDisplayName && (channel instanceof TextChannel);
    const sender = shouldUseUserSpoofing && await this.getWebhookForChannel(channel) || channel;

    // apply bridging prefix for non-webhook messages only
    if (sender === channel && message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userHandle}: `); // use handles for discord only
      applyMessageBridgingPrefix(message);
    }
    const editMessage = (sender instanceof Webhook ? sender.editMessage.bind(sender) : sender.messages.edit.bind(sender.messages));
    await editMessage(message.messageId, `${message.text} ${message.media?.url ?? ''}`.trim());
  }

  public async setCommandList(commandList: { command: string; description: string; }[]): Promise<void> {
    await this.rest?.put(Routes.applicationCommands(config['discord-bot'].clientId), {
      body: commandList.map(({ command, description }) => ({ name: command, description })),
    });
  }

  public getInviteLink() {
    return `https://discordapp.com/oauth2/authorize?client_id=${config['discord-bot'].clientId}&permissions=8533303838112832&scope=bot`;
  }

  private async transformMessage(message: Message): Promise<GenericMessage> {
    const singleAttachment = message.attachments.size === 1 ? message.attachments.values().next().value : undefined;
    const hasMultiAttachments = message.attachments.size > 1;
    const media = singleAttachment ? {
      type: ({
        image: 'photo',
        video: 'video',
      } as any)[singleAttachment.content_type?.split('/')[0]] || 'file',
      url: singleAttachment.url,
      mimeType: singleAttachment.content_type,
      size: singleAttachment.size,
    } : undefined;
    const reference = message.reference ? await message.fetchReference() : undefined;
    return {
      clientName: 'discord-bot',
      text: convertDiscordMessage(message.content ?? '') + (hasMultiAttachments ? ' ' + message.attachments.map((a: any) => a.url).join(' ') : ''),
      userId: message.author?.id,
      userHandle: message.author?.globalName ?? message.author?.username,
      userDisplayName: message.author?.globalName ?? message.author?.username,
      chatId: message.channelId,
      messageId: message.id,
      media,
      messageIdReplied: reference?.id,
      messageReplied: reference && await this.transformMessage(reference),
      userIdReplied: reference?.author?.id,
      platformMessage: message,
      unixDate: Math.floor(new Date(message.createdTimestamp).getTime() / 1000),
      isServiceMessage: !!message.author?.bot,
    }
  }

  private async transformInteraction(interaction: Interaction): Promise<GenericMessage> {
    return {
      clientName: 'discord-bot',
      text: interaction.toString(),
      userId: interaction.user.id,
      userHandle: interaction.user.globalName ?? interaction.user.username,
      userDisplayName: interaction.user.globalName ?? interaction.user.username,
      chatId: interaction.channelId!,
      messageId: interaction.id,
      platformMessage: interaction,
      unixDate: Math.floor(new Date(interaction.createdTimestamp).getTime() / 1000),
      isServiceMessage: !!interaction.user.bot,
    }
  }

  private async getWebhookForChannel(channel: TextChannel): Promise<Webhook | undefined> {
    try {
      if (!this.webhookForChannel.has(channel.id)) {
        const existingWebhook = (await channel.fetchWebhooks()).find(webhook => webhook.applicationId === config['discord-bot'].clientId);
        const webhook = existingWebhook ?? await channel.createWebhook({
          name: this.client?.user?.displayName ?? config.generalName,
          avatar: this.client?.user?.avatarURL() ?? '',
        });
        this.webhookForChannel.set(channel.id, webhook);
      }
      return this.webhookForChannel.get(channel.id)!;
    } catch (e) {
      console.error(`Failed to create webhook for channel ${channel.id}: ${e}`);
    }
  }
}

export default new DiscordBotClient();
