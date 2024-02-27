// @ts-ignore
import discord from 'discord-user-bots';
import config from '../../config.json';
import crypto from 'crypto';
import dismoji from 'discord-emoji';
import { getDiscordLinks, setDiscordLink, getDiscordNickname } from '../database/discord';
import { IBot, ICommonMessage, ICommonMessageContext, IContext } from 'typings';
import { Telegram } from 'telegraf';
import { User } from 'telegraf/typings/core/types/typegram';

const discordLinkMap = new Map<string, {
  client: discord.Client;
  discordChannelId: string;
  discordGuildId: string;
}>();

const convertDiscordMessage = (text: string) => {
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

const createLinkBot = (telegram: Telegram, chatId: string, discordChannelId: string, discordGuildId: string) => {
  if (discordLinkMap.has(chatId)) {
    try {
      discordLinkMap.get(chatId)!.client.close();
    } catch (e) { }
    discordLinkMap.delete(chatId);
  }
  const client = new discord.Client(config.discordUserToken);
  discordLinkMap.set(chatId, {
    client,
    discordChannelId,
    discordGuildId,
  });
  client.on = new Proxy({}, {
    get: (_, eventName) => {
      if (eventName === 'message_create') return (message: any) => {
        const channelId = String(message.channel_id);
        console.log(Date(), eventName, JSON.stringify(message));
        if (channelId !== discordChannelId) return;
        if (message.author.username === config.discordUsername) return;
        const messageContent = convertDiscordMessage(message.content);
        if (!message.author || message.author.bot) {
          telegram.sendMessage(chatId, messageContent);
        } else {
          telegram.sendMessage(chatId, `${message.author.username}: ${messageContent}`);
        }
      };
      if (eventName === 'heartbeat_received') return () => {
        console.log(Date(), eventName);
        if (client._heartbeatStopTimeout) clearTimeout(client._heartbeatStopTimeout);
        client._heartbeatStopTimeout = setTimeout(() => {
          console.log('_heartbeatStopTimeout');
          createLinkBot(telegram, chatId, discordChannelId, discordGuildId);
        }, 60000);
      };
      if (eventName === 'message_edit') return (message: any) => {
        const channelId = String(message.channel_id);
        console.log(Date(), eventName, JSON.stringify(message));
        if (channelId !== discordChannelId) return;
        if (!message.interaction || message.interaction.name !== 'list') return;
        const messageContent = convertDiscordMessage(message.content);
        telegram.sendMessage(chatId, messageContent);
      }
      // Log default events
      return (...args: any[]) => {
        console.log(Date(), eventName, JSON.stringify(args));
      };
    },
  });
};

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const [guildId, channelId] = ctx.message.text!.split(' ').slice(1);
  if (!channelId || !/^\d+$/.test(channelId)) {
    (ctx as IContext).reply('用法：/discord <服务器 ID> <频道 ID>');
    return;
  }
  const chatId = String(ctx.message.chat.id);
  await setDiscordLink(chatId, channelId, guildId);
  createLinkBot(ctx.telegram, chatId, channelId, guildId);
};

export const init = async (bot: IBot) => {
  const discordLinks = await getDiscordLinks();
  for (const link of discordLinks) {
    createLinkBot(bot.telegram, link.chatId, link.discordChannelId, link.discordGuildId);
  }
};

export const handleTelegramMessage = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const chatId = String(ctx.message.chat.id);
  const userId = String(message.from.id);
  const link = discordLinkMap.get(chatId);
  if (!link) return false;
  const { client, discordChannelId, discordGuildId } = link;
  const formatUser = async (user: User) => {
    const username = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    return (await getDiscordNickname(chatId, userId)) || username;
  }
  if (/^\/update(\s|$)/.test(message.text!)) {
    return require('./update')(ctx);
  }

  if (/^\/list(\s|$)/.test(message.text!)) {
    const commands = await client.requester.fetch_request(
      `guilds/${discordGuildId}/application-command-index`,
      undefined, client.clientData, 'GET'
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
      await client.call_check([]);
    } catch (e: any) {
      (ctx as IContext).reply('转发消息失败：' + e.message, {
        reply_to_message_id: message.message_id,
      });
      return;
    }
    const interactionRes = await client.requester.fetch_request('interactions', payload);
    console.log('Sent Discord interaction:', interactionRes);
    const { message_id: messageId } = await (ctx as IContext).reply('已发送 /list 指令给 Discord 侧，请等待回应。本消息将自动删除。');
    await new Promise(r => setTimeout(r, 3000));
    await ctx.telegram.deleteMessage(message.chat.id, messageId);
    return;
  }

  try {
    client.send(discordChannelId, {
      content: [
        await formatUser(message.from),
        ': ',
        message.forward_from ? `[Fw: ${await formatUser(message.forward_from)}] ` : '',
        message.reply_to_message ? `[Re: ${await formatUser(message.reply_to_message.from!)}] ` : '',
        message.text || message.caption || (message.photo ? '[Photo]' : '[Unsupported message]'),
      ].join(''),
    });
  } catch (e) {
    console.error('转发指令失败', e);
  }
};
