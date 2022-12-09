module.exports = (ctx) => {
  const { message } = ctx;
  const replied = message.reply_to_message;
  ctx.telegram.deleteMessage(replied.chat.id, replied.message_id);
};
