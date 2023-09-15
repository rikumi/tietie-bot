const discord = require('discord-user-bots');
const config = require('../config.json');
const crypto = require('crypto');
const dismoji = require('discord-emoji');
const { getDiscordLinks, setDiscordLink } = require('../modules/database');

const discordLinkMap = {};

const convertDiscordEmoji = (text) => {
    return text.replace(/:(\w+):/g, (match, emojiName) => {
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
    chatId = parseInt(chatId);
    if (discordLinkMap[chatId]) {
        discordLinkMap[chatId].client.close();
        delete discordLinkMap[chatId];
    }
    const client = new discord.Client(config.discordUserToken);
    discordLinkMap[chatId] = {
        client,
        discordChannelId,
    };
    client.on.message_create = (message) => {
        if (Number(message.channel_id) !== Number(discordChannelId)) return;
        if (message.author.username === config.discordUsername) return;
        const messageContent = convertDiscordEmoji(message.content);
        if (!message.author || message.author.bot) {
            telegram.sendMessage(chatId, messageContent);
        } else {
            telegram.sendMessage(chatId, `${message.author.username}: ${messageContent}`);
        }
    };
    client.on.discord_disconnect = () => {
        console.log('discord_disconnect');
        createLinkBot(telegram, String(chatId), discordChannelId);
        client.close();
    };
};

module.exports = async (ctx) => {
    const channelId = ctx.message.text.split(' ')[1];
    if (!channelId) {
        ctx.reply('用法：/discord <服务器 ID> <频道 ID>');
        return;
    }
    const chatId = ctx.message.chat.id;
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

    client.send(discordChannelId, {
        content: [
            `**${username}**`,
            ': ',
            message.forward_from ? `[Fw:${formatUser(message.forward_from)}] ` : '',
            message.reply_to_message ? `[Re:${formatUser(message.reply_to_message.from)}] ` : '',
            message.text || message.caption || (message.photo ? '[Photo]' : '[Unsupported message]'),
        ].join(''),
    });
};
