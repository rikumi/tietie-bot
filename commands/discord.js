const discord = require('discord-user-bots');
const config = require('../config.json');
const crypto = require('crypto');
const dismoji = require('discord-emoji');
const { getDiscordLinks, setDiscordLink } = require('../database');

const discordLinkMap = {};

const convertDiscordMessage = (text) => {
  return text.replace(/\\/g, '').replace(/:(\w+):/g, (match, emojiName) => {
    for (const category of Object.keys(dismoji)) {
      if (typeof dismoji[category][emojiName] === 'string') {
        return dismoji[category][emojiName];
      }
    }
    return match;
  });
};

if (!crypto.getRandomValues) {
  crypto.getRandomValues = function (arr) {
    for (var i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  };
}

const createLinkBot = (telegram, chatId, discordChannelId) => {
  if (discordLinkMap[chatId]) {
    try {
      discordLinkMap[chatId].client.close();
    } catch (e) { }
    delete discordLinkMap[chatId];
  }
  const client = new discord.Client(config.discordUserToken);
  discordLinkMap[chatId] = {
    client,
    discordChannelId,
  };
  client.on = new Proxy({}, {
    get: (_, eventName) => {
      if (eventName === 'message_create') return (message) => {
        console.log(Date(), eventName, JSON.stringify(message));
        if (String(message.channel_id) !== String(discordChannelId)) return;
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
          createLinkBot(telegram, chatId, discordChannelId);
        }, 60000);
      };
      if (eventName === 'message_edit') return (message) => {
        console.log(Date(), eventName, JSON.stringify(message));
        if (String(message.channel_id) !== String(discordChannelId)) return;
        if (!message.interaction || message.interaction.name !== 'list') return;
        const messageContent = convertDiscordMessage(message.content);
        telegram.sendMessage(chatId, messageContent);
      }
      // Log default events
      return (...args) => {
        console.log(Date(), eventName, JSON.stringify(args));
      };
    },
  });
};

module.exports = async (ctx) => {
  const channelId = ctx.message.text.split(' ')[1];
  if (channelId === 'rejoin') {
    module.exports.init();
    return '已重新加入所有频道';
  }
  if (!channelId || !/^\d+$/.test(channelId)) {
    ctx.reply('用法：/discord <服务器 ID> <频道 ID>');
    return;
  }
  const chatId = String(ctx.message.chat.id);
  await setDiscordLink(chatId, channelId);
  createLinkBot(ctx.telegram, chatId, channelId);
};

module.exports.init = async (bot) => {
  const discordLinks = await getDiscordLinks();
  for (const link of discordLinks) {
    createLinkBot(bot.telegram, link.chatId, link.discordChannelId);
  }
};

module.exports.handleTelegramMessage = async (ctx) => {
  const { message } = ctx;
  const link = discordLinkMap[message.chat.id];
  if (!link) return false;
  const { client, discordChannelId } = link;
  const formatUser = (user) => user.username || ((user.first_name || '') + ' ' + (user.last_name || '')).trim();
  const username = formatUser(message.from);

  if (/^\/update(\s|$)/.test(message.text)) {
    return require('./update')(ctx);
  }

  if (/^\/list(\s|$)/.test(message.text)) {
    const commands = await client.requester.fetch_request(
      `channels/${discordChannelId}/application-commands/search?type=1&query=list&limit=1&include_applications=false`,
      undefined, client.clientData, 'GET'
    );
    const listCommand = commands.application_commands[0];
    const payload = {
      type: 2,
      application_id: listCommand.application_id,
      guild_id: listCommand.guild_id,
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
    } catch (e) {
      ctx.reply('转发消息失败：' + e.message, {
        reply_to_message_id: message.message_id,
      });
      return;
    }
    const interactionRes = await client.requester.fetch_request('interactions', payload);
    console.log('Sent Discord interaction:', interactionRes);
    const { message_id: messageId } = await ctx.reply('已发送 /list 指令给 Discord 侧，请等待回应。本消息将自动删除。');
    await new Promise(r => setTimeout(r, 3000));
    await ctx.telegram.deleteMessage(message.chat.id, messageId);
    return;
  }

  try {
    client.send(discordChannelId, {
      content: [
        username,
        ': ',
        message.forward_from ? `[Fw:${formatUser(message.forward_from)}] ` : '',
        message.reply_to_message ? `[Re:${formatUser(message.reply_to_message.from)}] ` : '',
        message.text || message.caption || (message.photo ? '[Photo]' : '[Unsupported message]'),
      ].join(''),
    });
  } catch (e) {
    console.error('转发指令失败', e);
  }
};
