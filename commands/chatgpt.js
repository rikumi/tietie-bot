const chatgpt = require('chatgpt-lib');
const { chatgptSessionToken } = require('../config.json');

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
const chatbot = new chatgpt.ChatGPT({ SessionToken: chatgptSessionToken });

module.exports = (ctx, bot) => {
  const { message } = ctx;
  ctx.reply('ChatGPT 正在思考…', {
    ...msgOptions,
    reply_to_message_id: message.message_id,
  }).then(async replyMessage => {
    try {
      const answer = await chatbot.ask(message.text.replace(/^\/chatgpt\s+/, ''));
      const trimmedAnswer = answer.length > 512 ? answer.slice(0, 512) + '...' : answer;
      ctx.telegram.editMessageText(message.chat_id, replyMessage.message_id, escape(trimmedAnswer));
    } catch (e) {
      ctx.telegram.editMessageText(message.chat_id, replyMessage.message_id, escape('请求失败了，可能是接口被限频或者 token 失效，请过一会再问我这个问题。'));
    }
  });
};
