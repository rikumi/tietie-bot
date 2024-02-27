const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');
const alias = require('./commands/alias');
const discord = require('./commands/discord');
const repeat = require('./commands/repeat');
const search = require('./commands/search');
const video = require('./commands/set_video');
const tietie = require('./commands/tietie');

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const bot = new Telegraf(config.telegramBotToken);

const handleMessage = async (ctx) => {
  const { message } = ctx;
  if (!message.text) return;
  // 各种非 slash commands
  if (!message.text.startsWith('/') || message.text.trim() === '/list') {
    search.recordChatMessage(ctx);
    if (await discord.handleTelegramMessage(ctx) !== false) return;
    if (await repeat.handleGeneralMessage(ctx) !== false) return;
    return;
  }
  // 调用 slash commands
  await alias.handleSlashCommand(ctx);
  if (await video.handleSlashCommand(ctx) !== false) return;
  if (await tietie.handleSlashCommand(ctx, bot) !== false) return;

  const [action, botUsername] = message.text.trim().split(' ')[0].slice(1).split('@');
  if (botUsername && bot.botInfo && botUsername !== bot.botInfo.username) {
    return;
  }
  const module = `./commands/${action}.js`;
  if (!/^\w+$/.test(action) || !fs.existsSync(module)) {
    return;
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
  search.recordEditedMessage(ctx);
});

bot.launch().then(async () => {
  await discord.init(bot);
  console.log('Service started!', bot.botInfo);
});

module.exports = { bot };
