const { Telegraf } = require('telegraf');
const config = require('./config.json');

const bot = new Telegraf(config.telegramBotToken);

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true
};

bot.on('message', (ctx) => {
  const { message } = ctx;
  if (!message.text || !message.text.startsWith('/') || /^\/[\w\-]+ /.test(message.text)) return;
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  const formatUser = (user, customName) => `[${escape(customName || user.first_name)}](https://t.me/${user.username})`;
  const extractUser = (message, entity) => ({ first_name: message.text.substr(entity.offset, entity.length), username: entity.url.split('/').pop() });
  const sender = message.from;
  const senderLink = formatUser(sender);
  const replied = message.reply_to_message;
  const repliedBotMsg = replied && replied.from.username === bot.botInfo.username ? replied : undefined;
  const lastMentionEntity = repliedBotMsg && (repliedBotMsg.entities || []).filter(k => k.type === 'text_link')[0];
  const lastMentionUser = lastMentionEntity && extractUser(repliedBotMsg, lastMentionEntity);
  const receiver = lastMentionUser || replied && replied.from || sender;
  const receiverLink = formatUser(receiver, receiver.username === sender.username ? '自己' : undefined);
  const action = message.text.slice(1);
  ctx.reply(`${senderLink} ${action}了 ${receiverLink}！`, msgOptions);
});

bot.launch();