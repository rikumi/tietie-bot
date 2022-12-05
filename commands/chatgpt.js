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
  chatbot.ask(message.text.replace(/^\/chatgpt\s+/, '')).then(answer => ctx.reply(escape(answer), {
    ...msgOptions,
    reply_to_message_id: message.id,
  }));
};
