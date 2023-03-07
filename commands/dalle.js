const { askImage } = require('../modules/chatgpt');

const lastGenerateTimeMap = {};

module.exports = async (ctx) => {
  const { message } = ctx;
  const text = message.text.trim().replace(/^.*?\s+/, '');
  if (!text) return;
  const lastGenerateTime = lastGenerateTimeMap[message.chat.id];
  if (lastGenerateTime + 30 * 60 * 1000 > Date.now()) {
    ctx.reply('为节约开销，每个会话每半小时只允许生成一张图片。请' + Math.max(1, (Date.now() - lastGenerateTime) / 60000) + '分钟后再试');
    return;
  }
  lastGenerateTimeMap[message.chat.id] = Date.now();
  ctx.telegram.sendChatAction(message.chat.id, 'upload_photo');
  const image = await askImage(text);
  ctx.telegram.sendMediaGroup(message.chat.id, null, {
    media: [{
      type: 'photo',
      media: image,
    }],
    reply_to_message_id: message.message_id,
  });
};
