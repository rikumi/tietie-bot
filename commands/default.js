const { getVideoReply } = require('../database');

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

module.exports = async (ctx, bot) => {
  const { message } = ctx;
  const command = message.text.trim().split(/\s+/)[0].replace(/^\//, '');

  // 视频别名
  const videoId = await getVideoReply(message.chat.id, command);
  if (videoId) {
    ctx.telegram.sendVideo(message.chat.id, videoId, { reply_to_message_id: message.message_id });
  }

  // 默认行为 /贴贴，要求不能是全英文指令
  if (!/[^\u0000-\u00ff]/.test(command)) {
    return;
  }
  const escape = (text) => text.replace(/([\u0000-\u007f])/g, '\\$1');
  const formatUser = (user, customName) => `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  const extractUser = (message, entity) => ({
    first_name: message.text.substr(entity.offset, entity.length),
    id: entity.url.split(/=/).pop(),
  });

  const replied = message.reply_to_message;
  const repliedBotMsg = replied && replied.from.username === bot.botInfo.username ? replied : undefined;
  const lastMentionEntity = repliedBotMsg && (repliedBotMsg.entities || []).filter((k) => k.type === 'text_link')[0];
  const lastMentionUser = lastMentionEntity && extractUser(repliedBotMsg, lastMentionEntity);

  let sender = message.from;
  let receiver = lastMentionUser || (replied && replied.from) || sender;

  const senderLink = formatUser(sender);
  const receiverLink = formatUser(receiver, receiver.id === sender.id ? '自己' : undefined);
  const [action, ...rest] = message.text.slice(1).split(/\s+/).map(escape);
  const postfix = rest.join(' ').trim();
  let result = `${senderLink} ${action}${postfix || action.endsWith('了') ? '' : '了'} ${receiverLink} ${postfix}`.trim() + '！';

  ctx.reply(result, {
    ...msgOptions,
    reply_to_message_id: message.message_id,
  });
};
