const { pickVideo } = require('../modules/database');

module.exports = async (ctx) => {
  const groupId = ctx.message.chat.id;
  const videoId = await pickVideo(groupId);

  if (videoId) {
    ctx.telegram.sendVideo(message.chat.id, videoId, { reply_to_message_id: message.message_id });
  }
};
