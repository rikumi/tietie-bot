module.exports = (ctx) => {
  ctx.telegram.sendVideo(ctx.message.chat.id, 'BAACAgUAAxkBAAIBtWSSrJ4Twx197Ihfc6JIN8YSqTChAAIiDAACBR6QVMHRgsOasb2CLwQ', {
    reply_to_message_id: ctx.message.message_id,
  });
};
