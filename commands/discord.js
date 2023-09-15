const discord = require('discord-user-bots');
const config = require('../config.json');
const crypto = require('crypto');
const dismoji = require('discord-emoji');
const { getDiscordLinks, setDiscordLink } = require('../modules/database');

// temporary
config.discordUsername = 'nyaacat_tg';
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
        } catch (e) {}
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
                console.log(Date(), eventName, JSON.stringify([message]));
                if (String(message.channel_id) !== String(discordChannelId)) return;
                if (message.author.username === config.discordUsername) return;
                const messageContent = convertDiscordMessage(message.content);
                if (!message.author || message.author.bot) {
                    telegram.sendMessage(chatId, messageContent);
                } else {
                    telegram.sendMessage(chatId, `${message.author.username}: ${messageContent}`);
                }
            };
            if (eventName === 'heartbeat_received') return (...args) => {
                console.log(Date(), eventName, JSON.stringify(args));
                if (client._heartbeatStopTimeout) clearTimeout(client._heartbeatStopTimeout);
                client._heartbeatStopTimeout = setTimeout(() => {
                    console.log('_heartbeatStopTimeout');
                    createLinkBot(telegram, chatId, discordChannelId);
                }, 60000);
            };
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
    if (!link) return;
    const { client, discordChannelId } = link;
    const formatUser = (user) => user.username || ((user.first_name || '') + ' ' + (user.last_name || '')).trim();
    const username = formatUser(message.from);

    client.send(discordChannelId, {
        content: [
            username,
            ': ',
            message.forward_from ? `[Fw:${formatUser(message.forward_from)}] ` : '',
            message.reply_to_message ? `[Re:${formatUser(message.reply_to_message.from)}] ` : '',
            message.text || message.caption || (message.photo ? '[Photo]' : '[Unsupported message]'),
        ].join(''),
    });
};
