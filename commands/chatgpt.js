const { instances } = require('./chatgpt_token');
const axios = require('axios');

module.exports = (ctx, bot) => {
  const { message } = ctx;
  const chatId = message.chat.id;
  const chatbot = instances[chatId];
  if (!chatbot) {
    ctx.reply('当前会话未设置 Token，请使用 /chatgpt_token <session_token> 设置', { reply_to_message_id: message.message_id });
    return;
  }
  ctx.reply('ChatGPT 正在思考…', { reply_to_message_id: message.message_id }).then(async replyMessage => {
    try {
      const answer = await chatbot.ask(message.text.replace(/^\/chatgpt\s+/, ''));
      const trimmedAnswer = answer.length > 512 ? answer.slice(0, 512) + '...' : answer;
      ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, trimmedAnswer);
    } catch (e) {
      console.error(e);
      ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, '请求失败了，可能是接口被限频或者 token 失效，请过一会再问我这个问题。');
    }
  });
};
