// @ts-ignore
import discord from 'discord-user-bots';
import config from '../../config.json';
import crypto from 'crypto';
import * as dismoji from 'discord-emoji';
import { getDiscordLinks, setDiscordLink, getDiscordNickname } from '../database/discord';
import { IBot, ICommonMessageContext, IContext } from 'typings';
import { Telegram } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';
import { tryDescribeMessage } from 'src/modules/describe';

let globalClient: discord.Client | undefined;
let globalClientReady: Promise<void> | undefined;

const discordLinkMap = new Map<string, {
  discordChannelId: string;
  discordGuildId: string;
}>();

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

const initGlobalBot = async (telegram: Telegram, forceRestart = false) => {
  if (globalClient) {
    if (!forceRestart) return;
    globalClient.close();
    globalClient = undefined;
  }
  globalClient = new discord.Client(config.discordUserToken);
  globalClientReady = new Promise(r => globalClient.on.ready = r);
  globalClient.on.message_create = (message: any) => {
    const channelId = String(message.channel_id);
    const chatId = Array.from(discordLinkMap.keys()).find(k => discordLinkMap.get(k)?.discordChannelId === channelId);
    if (!chatId) return;
    if (message.author.username === config.discordUsername) return;
    const messageContent = convertDiscordMessage(message.content);
    const isServiceMessage = !message.author || message.author.bot;
    const finalContent = isServiceMessage ? messageContent : `${message.author.username}: ${ messageContent }`;
    if (!finalContent.includes(': ')) {
      telegram.sendMessage(chatId, finalContent);
      return;
    }
    const nameUtf16Length = Buffer.from(finalContent.split(': ')[0], 'utf16le').length / 2;
    telegram.sendMessage(chatId, finalContent, {
      entities: [{ type: 'bold', offset: 0, length: nameUtf16Length }],
    });
  };
  globalClient.on.heartbeat_received = () => {
    if (globalClient._heartbeatStopTimeout) clearTimeout(globalClient._heartbeatStopTimeout);
    globalClient._heartbeatStopTimeout = setTimeout(() => {
      console.log('_heartbeatStopTimeout');
      initGlobalBot(telegram, true);
    }, 60000);
  };
  globalClient.on.message_edit = (message: any) => {
    const channelId = String(message.channel_id);
    const chatId = Array.from(discordLinkMap.keys()).find(k => discordLinkMap.get(k)?.discordChannelId === channelId);
    if (!chatId) return;
    if (!message.interaction || message.interaction.name !== 'list') return;
    const messageContent = convertDiscordMessage(message.content);
    telegram.sendMessage(chatId, messageContent);
  };
  await globalClientReady;
};

const createLinkBot = async (telegram: Telegram, chatId: string, discordChannelId: string, discordGuildId: string, forceRestart = false, sendResults = false) => {
  discordLinkMap.set(chatId, {
    discordChannelId,
    discordGuildId,
  });
  await initGlobalBot(telegram, forceRestart);
  // send results
  const guildInfo = globalClient.info.guilds.find((guild: any) => guild.id === discordGuildId);
  const channelInfo = guildInfo.channels.find((channel: any) => channel.id === discordChannelId);
  const { name: guildName, member_count: memberCount } = guildInfo;
  const { name: channelName, topic: channelTopic } = channelInfo;
  if (sendResults) {
    telegram.sendMessage(chatId, `已链接到 Discord 频道：${guildName} #${channelName}，共 ${memberCount} 名成员。${channelTopic ? `\n主题：${channelTopic}` : ''}`);
  }
};

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const [guildId, channelId] = ctx.message.text!.split(' ').slice(1);
  const chatId = String(ctx.message.chat.id);
  if (guildId === 'rejoin') {
    const link = discordLinkMap.get(chatId);
    if (!link) {
      return '本群未链接到任何 Discord 频道';
    }
    createLinkBot(ctx.telegram, chatId, link.discordChannelId, link.discordGuildId, true, true);
    return;
  }
  if (!channelId || !/^\d+$/.test(channelId)) {
    (ctx as IContext).reply('用法：/discord <服务器 ID> <频道 ID>');
    return;
  }
  await setDiscordLink(chatId, channelId, guildId);
  createLinkBot(ctx.telegram, chatId, channelId, guildId, false, true);
  const result = (await getDiscordLinks()).find(k => k.chatId === chatId);
  return `已尝试链接到 Discord 服务器 ${result?.discordGuildId} - 频道 ${result?.discordChannelId}`;
};

export const init = async (bot: IBot) => {
  const discordLinks = await getDiscordLinks();
  for (const link of discordLinks) {
    await createLinkBot(bot.telegram, link.chatId, link.discordChannelId, link.discordGuildId);
  }
};

export const handleTelegramMessage = async (ctx: ICommonMessageContext, bot: IBot) => {
  const { message } = ctx;
  const chatId = String(ctx.message.chat.id);
  const userId = String(message.from.id);
  const link = discordLinkMap.get(chatId);
  if (!link) return false;
  const { discordChannelId, discordGuildId } = link;
  if (/^\/list(\s|$)/.test(message.text!)) {
    const commands = await globalClient.requester.fetch_request(
      `guilds/${discordGuildId}/application-command-index`,
      undefined, globalClient.clientData, 'GET'
    );
    const listCommand = commands.application_commands.find((c: any) => c.name === 'list');
    const payload = {
      type: 2,
      application_id: listCommand.application_id,
      guild_id: discordGuildId,
      channel_id: discordChannelId,
      session_id: require('crypto').randomBytes(16).toString('hex'),
      data: {
        ...listCommand,
        application_command: listCommand,
        options: [],
        attachments: [],
      },
      nonce: String(Math.floor(Date.now() * 666666)),
    };
    try {
      await globalClient.call_check([]);
    } catch (e: any) {
      (ctx as IContext).reply('转发消息失败：' + e.message, {
        reply_to_message_id: message.message_id,
        disable_notification: true,
      });
      return;
    }
    const interactionRes = await globalClient.requester.fetch_request('interactions', payload);
    console.log('Sent Discord interaction:', interactionRes);
    const { message_id: messageId } = await (ctx as IContext).reply('已发送 /list 指令给 Discord 侧，请等待回应。本消息将自动删除。');
    await new Promise(r => setTimeout(r, 3000));
    await ctx.telegram.deleteMessage(message.chat.id, messageId);
    return;
  }

  if (/^\//.test(message.text!)) {
    return false;
  }

  try {
    const formatUser = async (user: User) => {
      const username = user.username /*?.toLowerCase()*/ || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      return (await getDiscordNickname(chatId, userId)) || username;
    }
    const content = await tryDescribeMessage(message, bot, formatUser);
    globalClient.send(discordChannelId, { content });
  } catch (e) {
    console.error('转发指令失败', e);
  }
};
