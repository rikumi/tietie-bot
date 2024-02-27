const { setChatGPTSystemMessage } = require('../database/chatgpt');

module.exports = async (ctx) => {
  const { message } = ctx;
  const text = message.text.trim().replace(/^.*?\s+/, '');
  if (!text) return;
  const chatId = message.chat.id;
  await setChatGPTSystemMessage(chatId, text);
  return '设置 prompt 成功';
};
