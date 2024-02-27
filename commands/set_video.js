const { setVideoReply, getVideoReply } = require('../database/video_reply');

const handleSlashCommand = async (ctx) => {
  if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith('/')) {
    return false;
  }
  const [command] = ctx.message.text.slice(1).split(/\s+/);
  const videoId = await getVideoReply(ctx.message.chat.id, command);
  if (videoId) {
    ctx.telegram.sendVideo(ctx.message.chat.id, videoId, { reply_to_message_id: ctx.message.message_id });
    return true;
  }
  return false;
};

module.exports = async (ctx) => {
  const { message } = ctx;
  const command = message.text.trim().split(/\s+/)[1];
  const replied = message.reply_to_message;
  const chatId = message.chat.id;
  if (!command || !replied || !replied.video) {
    return '用法：引用视频消息并回复 /set_video <响应指令名>';
  }
  const fileId = replied.video.file_id;
  await setVideoReply(chatId, command, fileId);
  return 'OK';
};

module.exports.handleSlashCommand = handleSlashCommand;
