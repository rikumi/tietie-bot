const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

module.exports = async (ctx) => {
  const { message } = ctx;
  const content = message.text.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  const formatUser = (user, customName) => `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  ctx.reply(`${formatUser(message.from)} ${escape(content)}！`, msgOptions);
};
