const ChatGPT = require('../modules/chatgpt');
const { getChatGPTToken } = require('../modules/database');

module.exports = async (ctx) => {
  const { message } = ctx;
  const chatId = message.chat.id;
  const token = await getChatGPTToken(chatId);
  if (!token) {
    ctx.reply('当前会话未设置 Token，请使用 /chatgpt_token <session_token> 设置。Token 需要在 chat.openai.com/chat 页面上获取 Cookie 获得。', { reply_to_message_id: message.message_id });
    return;
  }
  const chatbot = ChatGPT.getInstance(token);
  const replyMessage = await ctx.reply('…', { reply_to_message_id: message.message_id });
  try {
    let lastEditTime = Date.now();
    let lastAnswer = '';
    await chatbot.ask(message.text.trim().split(/\s+/)[1], (answer) => {
      if (lastAnswer === answer) return;
      lastAnswer = answer;
      if (Date.now() - lastEditTime < 1000) return;
      lastEditTime = Date.now();
      ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, answer + '…');
    });
    ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, lastAnswer);
  } catch (e) {
    console.error(e);
    ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, '请求失败了，可能是接口被限频或者 token 失效，请过一会再问我这个问题。');
  }
};
