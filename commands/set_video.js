const { setVideoReply } = require('../database');

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
