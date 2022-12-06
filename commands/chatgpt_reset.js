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
  chatbot.resetChat();
  ctx.reply('当前会话重置成功', { reply_to_message_id: message.message_id });
};
