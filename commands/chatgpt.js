const { ask } = require('../modules/chatgpt');
const { getChatGPTSystemMessage } = require('../modules/database');

const defaultSystemMessage = '你是贴贴 Bot，一个 Telegram 聊天机器人。你的每次回答尽量简短，不能超过 200 字。'

module.exports = async (ctx) => {
  const { message } = ctx;
  const chatId = message.chat.id;
  const question = message.text.trim().replace(/^.*?\s+/, '');
  if (!question) return;
  const replyMessage = await ctx.reply('…', { reply_to_message_id: message.message_id });

  const editMessage = async (text) => {
    try {
      ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, text);
    } catch (e) {
      if (e.message && e.message.includes('Too Many Requests')) {
        await new Promise(r => setTimeout(r, 1000));
        return editMessage(text);
      };
      throw e;
    }
  };

  try {
    const systemMessage = await getChatGPTSystemMessage(chatId) || defaultSystemMessage;
    await editMessage('[请求中]…');
    const answer = await ask(question, systemMessage);
    await editMessage(answer);
  } catch (e) {
    console.error(e);
    editMessage('请求失败了，可能是接口被限频或者 token 失效，请过一会再问我这个问题。\n' + e.message);
  }
};
