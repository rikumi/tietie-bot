const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');
const { startDatabase, getAlias } = require('./modules/database');
const { handlePrivateForward } = require('./commands/ask');
const discord = require('./commands/discord');

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const bot = new Telegraf(config.telegramBotToken);

const handleMessage = async (ctx) => {
  const { message } = ctx;

  // 私聊转发聊天记录：添加到人物设定集
  if (message.chat && message.chat.type === 'private' && (message.forward_from || message.forward_sender_name)) {
    handlePrivateForward(ctx);
    return;
  }

  // 将消息转发到 Discord，开启消息转发的群不响应其它指令
  if (await discord.handleTelegramMessage(ctx) !== false) {
    return;
  }

  if (!message.text || !message.text.startsWith('/')) {
    return;
  }

  // 调用 slash commands
  const action = message.text.split(' ')[0].split('@')[0].slice(1);
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

bot.launch().then(async () => {
  await startDatabase();
  await discord.init(bot);
  console.log('Service started!');
});
