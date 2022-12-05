const chatgpt = require('chatgpt-lib');
const instances = {};

module.exports = (ctx, bot) => {
  const { message } = ctx;
  const token = message.text.replace(/^\/chatgpt\s+/, '').trim();
  if (!token) {
    return;
  }
  const chatId = message.chat.id;
  instances[chatId] = new chatgpt.ChatGPT({ SessionToken: token });
  ctx.reply('Token 设置成功，会话初始化成功', { reply_to_message_id: message.message_id });
};

module.exports.instances = instances;
