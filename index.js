const { Telegraf } = require('telegraf');
const config = require('./config.json');
const fs = require('fs');
const { startDatabase, getAlias, appendCharacter } = require('./modules/database');

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const bot = new Telegraf(config.telegramBotToken);
const batchForwardReplyTimeoutMap = {};

const handleMessage = async (ctx) => {
  const { message } = ctx;

  // 私聊转发聊天记录：添加到人物设定集
  if (message.chat && message.chat.type === 'private' && message.forward_from) {
    const userId = message.forward_from.id;
    await appendCharacter(userId, message.text.slice(0, 140), message.from.id);
    if (batchForwardReplyTimeoutMap[message.from.id]) {
      clearTimeout(batchForwardReplyTimeoutMap[message.from.id]);
      delete batchForwardReplyTimeoutMap[message.from.id];
    }
    batchForwardReplyTimeoutMap[message.from.id] = setTimeout(() => {
      ctx.reply('已将以上转发内容添加到发送者的人设集');
    }, 1000);
    return;
  }

  // 调用 slash commands
  if (!message.text || !message.text.startsWith('/')) return;
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
  const { message } = ctx;
  const moduleName = ctx.callbackQuery.data.split(':')[0];
  const module = `./commands/${moduleName}.js`;
  try {
    const result = await require(module)(ctx, bot);
    if (result) ctx.reply(result);
  } catch (e) {
    console.error(e);
    ctx.reply('Error: ' + e.message);
  }
};

bot.on('message', (ctx) => {
  if (ctx.message.date * 1000 < Date.now() - 10000) return;
  handleMessage(ctx);
});

bot.on('callback_query', (ctx) => {
  handleCallbackQuery(ctx);
});

bot.launch().then(() => {
  startDatabase();
  console.log('Service started!');
});
