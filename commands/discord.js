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
        if (Number(message.channel_id) !== discordChannelId) return;
        if (message.author.username === config.discordUsername) return;
        const messageContent = convertDiscordEmoji(message.content);
        if (!message.author || message.author.bot) {
            telegram.sendMessage(chatId, messageContent);
        } else {
            telegram.sendMessage(chatId, `${message.author.username}: ${messageContent}`);
        }
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
    const username = message.from.username || (message.from.first_name + ' ' + message.from.last_name);
    client.send(discordChannelId, { content: `${username}: ${message.text || 'Unsupported message'}` });
};
