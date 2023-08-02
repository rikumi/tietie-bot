const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');
const { startDatabase } = require('./modules/database');

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const bot = new Telegraf(config.telegramBotToken);

const handleMessage = async (ctx) => {
  const { message } = ctx;
  if (!message.text || !message.text.startsWith('/')) return;
  const action = message.text.split(' ')[0].split('@')[0].slice(1);
  let module = `./commands/${action}.js`;
  if (!/^\w+$/.test(action) || !fs.existsSync(module)) module = `./commands/default.js`;
  try {
    const result = await require(module)(ctx, bot);
    if (result) ctx.reply(result, { reply_to_message_id: message.message_id });
  } catch (e) {
    console.error(e);
    ctx.reply('Error: ' + e.message, { reply_to_message_id: message.message_id });
  }
};

bot.on('message', (ctx) => {
  if (ctx.message.date * 1000 < Date.now() - 10000) return;
  handleMessage(ctx);
});

bot.on('callback_query', async (ctx) => {
  const { message } = ctx;
  const moduleName = ctx.callbackQuery.data.split(':')[0];
  const module = `./commands/${moduleName}.js`;
  try {
    const result = await require(module)(ctx, bot);
    if (result) ctx.reply(result, { reply_to_message_id: message.message_id });
  } catch (e) {
    console.error(e);
    ctx.reply('Error: ' + e.message, { reply_to_message_id: message.message_id });
  }
});

bot.launch().then(() => {
  startDatabase();
  console.log('Service started!');
});
