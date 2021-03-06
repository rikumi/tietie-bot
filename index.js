const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');

const bot = new Telegraf(config.telegramBotToken);

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true
};

bot.on('message', (ctx) => {
  const { message } = ctx;
  if (!message.text || !message.text.startsWith('/')) return;
  const action = message.text.split(' ')[0].slice(1);
  let module = `./commands/${action}.js`;
  if (!fs.existsSync(module)) module = `./commands/default.js`;
  const result = require(module)(ctx, bot);
  if (!result) return;
  ctx.reply(result, msgOptions);
});

bot.launch();