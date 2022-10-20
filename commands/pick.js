const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

module.exports = (ctx, bot) => {
  const content = ctx.message.text.split(/\s+/).slice(1);
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  if (content.length === 0) return;
  const random = Math.floor(content.length * Math.random());
  ctx.reply(content.map((e) => escape(e))[random], {
    ...msgOptions,
    reply_to_message_id: ctx.message.message_id,
  });
};
