const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

module.exports = (ctx, bot) => {
  const { message } = ctx;
  if (!/[^\u0000-\u00ff]/.test(message.text.split(/\s+/)[0])) return;
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  const formatUser = (user, customName) => `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  const extractUser = (message, entity) => ({
    first_name: message.text.substr(entity.offset, entity.length),
    id: entity.url.split(/=/).pop(),
  });
  const sender = message.from;
  const senderLink = formatUser(sender);
  const replied = message.reply_to_message;
  const repliedBotMsg = replied && replied.from.username === bot.botInfo.username ? replied : undefined;
  const lastMentionEntity = repliedBotMsg && (repliedBotMsg.entities || []).filter((k) => k.type === 'text_link')[0];
  const lastMentionUser = lastMentionEntity && extractUser(repliedBotMsg, lastMentionEntity);
  const receiver = lastMentionUser || (replied && replied.from) || sender;
  const receiverLink = formatUser(receiver, receiver.id === sender.id ? '自己' : undefined);
  const [action, ...rest] = message.text.slice(1).split(/\s+/).map(escape);
  const postfix = rest.join(' ').trim();
  ctx.reply(`${senderLink} ${action}${postfix ? '' : '了'} ${receiverLink} ${postfix}`.trim() + '！', msgOptions);
};
