const { pickVideo } = require('../database/video_reply');

module.exports = async (ctx) => {
  const groupId = ctx.message.chat.id;
  const videoId = await pickVideo(groupId);

  if (videoId) {
    ctx.telegram.sendVideo(ctx.message.chat.id, videoId, { reply_to_message_id: ctx.message.message_id });
  }
};
