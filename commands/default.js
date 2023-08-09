const impart = require('./impart');
const { getVideoReply } = require('../modules/database');

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

module.exports = async (ctx, bot) => {
  const { message } = ctx;
  if (!/[^\u0000-\u00ff]/.test(message.text.split(/\s+/)[0])) {
    const command = message.text.trim().split(/\s+/)[0].replace(/^\//, '');
    const videoId = await getVideoReply(message.chat.id, command);
    if (videoId) {
      ctx.telegram.sendVideo(message.chat.id, videoId, { reply_to_message_id: message.message_id });
    }
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
  let impartImpact = false;

  if (impart.isInImpart(message.chat.id) && sender.id !== receiver.id) {
    const random = Math.random();
    const originalReceiver = receiver;
    // 50% 概率变为自己操作自己
    if (random > 0.5) {
      receiver = sender;
      impartImpact = true;
    }
    // 25% 概率变为对方操作自己
    if (random > 0.75) {
      sender = originalReceiver;
      impartImpact = true;
    }
    // 2% 概率变为对方操作对方
    if (random < 0.02) {
      sender = originalReceiver;
      impartImpact = true;
    }
  }

  const senderLink = formatUser(sender);
  const receiverLink = formatUser(receiver, receiver.id === sender.id ? '自己' : undefined);
  const [action, ...rest] = message.text.slice(1).split(/\s+/).map(escape);
  const postfix = rest.join(' ').trim();
  let result = `${senderLink} ${action}${postfix ? '' : '了'} ${receiverLink} ${postfix}`.trim() + '！';

  if (impartImpact) {
    result += '\n\n\\#ImpartImpact';
  }

  ctx.reply(result, {
    ...msgOptions,
    reply_to_message_id: message.message_id,
  });
};
