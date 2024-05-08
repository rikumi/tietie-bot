import { GenericMessage } from 'src/clients/base';

export const handleSlashCommand = (_: GenericMessage | undefined, ctx: any) => {
  if (!ctx) return;
  const { message } = ctx;
  const replied = message.reply_to_message;
  if (!replied) return;
  ctx.telegram.deleteMessage(replied.chat.id, replied.message_id);
};

export const handleCustomAction = (ctx: any) => handleSlashCommand(undefined, ctx);
