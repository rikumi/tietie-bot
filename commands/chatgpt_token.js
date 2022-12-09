const ChatGPT = require('../modules/chatgpt');
const { setChatGPTToken } = require('../modules/database');

module.exports = async (ctx) => {
  const { message } = ctx;
  const token = message.text.trim().split(/\s+/)[1];
  if (!token || !/^[\w\-.]{2000,4000}$/.test(token)) {
    return 'Token 不符合格式！';
  }
  const chatId = message.chat.id;
  await setChatGPTToken(chatId, token);
  return 'Token 设置成功，会话初始化成功';
};
