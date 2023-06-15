module.exports = async (ctx) => {
  const { message } = ctx;
  const content = message.text.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const formatUser = (user, customName) => `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  return `${formatUser(message.from)} ${content}！`
};
