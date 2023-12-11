const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');
const { getAlias } = require('./database');
const discord = require('./commands/discord');
const repeat = require('./commands/repeat');
const { recordChatMessage, recordEditedMessage } = require('./commands/search');

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const bot = new Telegraf(config.telegramBotToken);

const handleMessage = async (ctx) => {
  recordChatMessage(ctx);

  const { message } = ctx;
  if (await discord.handleTelegramMessage(ctx) !== false) {
    return;
  }
  if (await repeat.handleGeneralMessage(ctx) !== false) {
    return;
  }

  if (!message.text || !message.text.startsWith('/')) {
    return;
  }
  // 调用 slash commands
  const [action, botUsername] = message.text.trim().split(' ')[0].slice(1).split('@');
  if (botUsername && bot.botInfo && botUsername !== bot.botInfo.username) {
    return;
  }
  let module = `./commands/${action}.js`;
  if (!fs.existsSync(module)) {
    const alias = await getAlias(message.chat.id, action);
    if (alias && /^\w+$/.test(alias)) {
      module = `./commands/${alias}.js`;
    }
  }
  if (!/^\w+$/.test(action) || !fs.existsSync(module)) {
    module = `./commands/default.js`;
  }
  try {
    const result = await require(module)(ctx, bot);
    if (result) ctx.reply(result, {
      reply_to_message_id: message.message_id,
    });
  } catch (e) {
    console.error(e);
    ctx.reply('Error: ' + e.message, {
      reply_to_message_id: message.message_id,
    });
  }
};

const handleCallbackQuery = async (ctx) => {
  const moduleName = ctx.callbackQuery.data.split(':')[0];
  const module = `./commands/${moduleName}.js`;
  try {
    const result = await require(module)(ctx, bot);
    if (result) ctx.reply(result);
  } catch (e) {
    console.error(e);
    // ctx.reply('Error: ' + e.message);
  }
};

bot.on('message', (ctx) => {
  if (ctx.message.date * 1000 < Date.now() - 10000) return;
  handleMessage(ctx);
});

bot.on('callback_query', (ctx) => {
  handleCallbackQuery(ctx);
});

bot.on('edited_message', (ctx) => {
  recordEditedMessage(ctx);
});

bot.launch().then(async () => {
  await discord.init(bot);
  console.log('Service started!', bot.botInfo);
});

module.exports = { bot };
