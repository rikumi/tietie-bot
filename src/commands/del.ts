export const handleTelegramContext = (ctx: any) => {
  const { message } = ctx;
  const replied = message.reply_to_message;
  if (!replied) return;
  ctx.telegram.deleteMessage(replied.chat.id, replied.message_id);
};
