module.exports = (ctx) => {
  const { message } = ctx;
  const replied = message.reply_to_message;
  return replied.video.file_id;
};
