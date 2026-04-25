import crypto from 'crypto';
import * as dismoji from 'discord-emoji';
import { EventEmitter } from 'events';
import discord, { escapeMarkdown, Events, GatewayIntentBits, Interaction, Message, Routes, TextChannel, Webhook } from 'discord.js';

import { GenericClient, GenericMessage, GenericMessageEntity, GenericMessageReaction, MessageToEdit, MessageToSend } from './base';
import config from '../../config.json';
import { applyMessageBridgingPrefix, prependMessageBridgingPrefix } from '.';
import { isDiscordWebhookEnabled } from 'src/database/discord';

const convertDismoji = (emojiName: string) => {
  for (const category of Object.keys(dismoji)) {
    const emoji = (dismoji as any)[category][emojiName];
    if (typeof emoji === 'string') return emoji;
  }
  return;
};

const convertDiscordMessage = (text: string) => {
  const rtlCharRegexp = /([\u04c7-\u0591\u05D0-\u05EA\u05F0-\u05F4\u0600-\u06FF\uFE70-\uFEFF])/g;
  if (rtlCharRegexp.test(text)) {
    text = text.replace(rtlCharRegexp, '$1\u202C'); // Force switch back to LTR for major chat clients
  }
  return text.replace(/\\/g, '').replace(/:(\w+):/g, (match, emojiName) => {
    return convertDismoji(emojiName) ?? match;
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
  private messageReactionStackMap = new Map<string, string[]>;

  public async start(): Promise<void> {
    if (this.client) {
      this.stop();
    }
    if (!config['discord-bot']?.token) {
      return;
    }
    this.rest = new discord.REST({ version: '10' }).setToken(config['discord-bot'].token);
    this.client = new discord.Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
    });
    this.botReady = new Promise(r => this.client!.on(Events.ClientReady, () => r()));

    this.client.on(Events.MessageCreate, async (message) => {
      if (message.author.id === this.client?.user?.id) return;
      if (!message.content && !message.attachments?.size) return;
      if (message.webhookId && [...this.webhookForChannel.values()].some(webhook => webhook.id === message.webhookId)) return;
      const transformedMessage = await this.transformMessage(message);
      this.emit('message', transformedMessage);
    });
    this.client.on(Events.InteractionCreate, (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      const transformedMessage = this.transformInteraction(interaction);
      this.emit('message', transformedMessage);
    });
    this.client.on(Events.MessageReactionAdd, (interaction, user) => {
      this.emit('reaction', {
        clientName: 'discord-bot',
        chatId: interaction.message.channelId,
        userId: user.id,
        messageId: interaction.message.id,
        reaction: convertDismoji(interaction.emoji.name!) ?? '👀',
      } satisfies GenericMessageReaction);
    });
    this.client.on(Events.MessageReactionRemove, (interaction, user) => {
      this.emit('reaction', {
        clientName: 'discord-bot',
        chatId: interaction.message.channelId,
        userId: user.id,
        messageId: interaction.message.id,
        reaction: convertDismoji(interaction.emoji.name!) ?? '👀',
        isRetracted: true,
      } satisfies GenericMessageReaction);
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
    if (!channel?.isSendable()) {
      throw new Error(`Channel ${message.chatId} is not found or not sendable`);
    }
    const shouldUseUserSpoofing = message.bridgedMessage?.userDisplayName && (channel instanceof TextChannel);
    const target = shouldUseUserSpoofing && await this.getWebhookForChannel(channel) || channel;
    const isUserSpoofingAvailable = target instanceof Webhook;

    // native replies does not work with user spoofing - see https://github.com/discord/discord-api-docs/discussions/3282
    if (message.messageIdReplied && isUserSpoofingAvailable) {
      try {
        const repliedMessage = await channel.messages.fetch(message.messageIdReplied);
        const repliedMessageContent = repliedMessage.content.slice(0, 10) + '...';

        prependMessageBridgingPrefix(message, `[回复给 ${repliedMessage.author.username}: ${repliedMessageContent}]: `); // use handles for discord only
        applyMessageBridgingPrefix(message);
      } catch (e) {
        prependMessageBridgingPrefix(message, `[回复给 未知消息]: `);
        applyMessageBridgingPrefix(message);
      }
    }

    // apply bridging prefix for non-webhook messages only
    if (target === channel && message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userHandle}: `); // use handles for discord only
      applyMessageBridgingPrefix(message);
    }

    const renderedText = this.renderEntitiesToDFM(message.entities ?? [], message.text);

    const messageSent = await target.send({
      username: isUserSpoofingAvailable ? message.bridgedMessage?.userDisplayName : undefined,
      avatarURL: isUserSpoofingAvailable ? message.bridgedMessage?.userAvatarUrl : undefined,
      content: `${renderedText} ${message.media?.url ?? ''}`.trim(),
      reply: message.messageIdReplied && !isUserSpoofingAvailable ? { messageReference: message.messageIdReplied } : undefined,
      ...message.platformMessageExtra ?? {},
    });
    return await this.transformMessage(messageSent);
  }

  public async editMessage(message: MessageToEdit): Promise<void> {
    const channel = await this.client?.channels.fetch(message.chatId);
    if (!channel?.isSendable()) {
      throw new Error(`Channel ${message.chatId} is not found or not sendable`);
    }
    const shouldUseUserSpoofing = message.bridgedMessage?.userDisplayName && (channel instanceof TextChannel);
    const target = shouldUseUserSpoofing && await this.getWebhookForChannel(channel) || channel;
    const isUserSpoofingAvailable = target instanceof Webhook;

    // apply bridging prefix for non-webhook messages only
    if (target === channel && message.bridgedMessage?.userDisplayName) {
      prependMessageBridgingPrefix(message, `${message.bridgedMessage.userHandle}: `); // use handles for discord only
      applyMessageBridgingPrefix(message);
    }

    const renderedText = this.renderEntitiesToDFM(message.entities ?? [], message.text);

    const editMessage = (target instanceof Webhook ? target.editMessage.bind(target) : target.messages.edit.bind(target.messages));
    await editMessage(message.messageId, {
      content: `${renderedText} ${message.media?.url ?? ''}`.trim(),
      reply: message.messageIdReplied && !isUserSpoofingAvailable ? { messageReference: message.messageIdReplied } : undefined,
      ...message.platformMessageExtra ?? {},
    });
  }

  public async applyReaction(reaction: GenericMessageReaction) {
    if (reaction.isRetracted) {
      return await this.retractReaction(reaction);
    }
    const { chatId, messageId, reaction: emoji } = reaction;
    const channel = await this.client?.channels.fetch(chatId);
    if (!channel?.isSendable()) {
      return;
    }
    const key = `${chatId}|${messageId}`;
    const existing = this.messageReactionStackMap.get(key) ?? [];
    this.messageReactionStackMap.set(key, [...existing, emoji]);
    // some poor handling of cache eviction
    setTimeout(() => this.messageReactionStackMap.delete(key), 1000 * 60 * 60);

    const message = await channel.messages.fetch(messageId);
    await message?.react(emoji);
  }

  public async retractReaction(reaction: GenericMessageReaction) {
    const { chatId, messageId, reaction: emoji } = reaction;
    const channel = await this.client?.channels.fetch(chatId);
    if (!channel?.isSendable()) {
      return;
    }
    const message = await channel.messages.fetch(messageId);

    const key = `${chatId}|${messageId}`;
    const existing = this.messageReactionStackMap.get(key) ?? [];
    const newEmojiList = existing.filter(e => e !== emoji);
    const newLastEmoji = newEmojiList.slice(-1)[0];

    if (newLastEmoji) {
      await message?.react(newLastEmoji);
      this.messageReactionStackMap.set(key, newEmojiList);
    } else {
      await message?.reactions.removeAll();
      this.messageReactionStackMap.delete(key);
    }
  }

  public async setCommandList(commandList: { command: string; description: string; }[]): Promise<void> {
     await this.rest?.put(Routes.applicationCommands(config['discord-bot'].clientId), {
       body: [], // commandList.map(({ command, description }) => ({ name: command, description })),
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
      userLink: message.author?.id ? `https://discord.com/channels/@me/${message.author.id}` : undefined,
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
    if (!await isDiscordWebhookEnabled(channel.id)) {
      return undefined;
    }
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

  private renderEntitiesToDFM(entities: GenericMessageEntity[], text: string): string {
    const tagsReversed = entities.map((e) => ((e.type as any) === 'newline' ? [e.offset] : [e.offset, e.offset + e.length]).map((position) => {
      const tagName = ({ bold: '**', italic: '_', strikethrough: '~~', underline: '__', mention: '[@', link: '[', image: '' } as any)[e.type] ?? e.type;
      const isOpenTag = position === e.offset;
      if (!tagName.startsWith('[') || isOpenTag) {
        return { tag: isOpenTag ? `\u200D${tagName}` : `${tagName}\u200D`, position, isCloseTag: !isOpenTag };
      }
      // close tags for closable tags
      return { tag: `](${e.url})`, position, isCloseTag: true };
    })).flat()
      // close tags should be closed first
      .sort((a, b) => a.position === b.position ? Number(a.isCloseTag) - Number(b.isCloseTag) : b.position - a.position);

    const buffer = Buffer.from(text, 'utf16le');
    const stack: string[] = [];
    let lastPosition = buffer.length / 2;
    for (const { tag, position } of tagsReversed) {
      stack.push(escapeMarkdown(buffer.subarray(position * 2, lastPosition * 2).toString('utf16le')));
      stack.push(tag);
      lastPosition = position;
    }
    stack.push(escapeMarkdown(buffer.subarray(0, lastPosition * 2).toString('utf16le')));
    return stack.reverse().join('');
  }
}

export default new DiscordBotClient();
