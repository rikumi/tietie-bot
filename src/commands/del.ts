import { ICommonMessageContext, IMaybeTextMessage } from 'typings';

export const handleSlashCommand = (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const replied: IMaybeTextMessage | undefined = message.reply_to_message;
  if (!replied) return;
  ctx.telegram.deleteMessage(replied.chat.id, replied.message_id);
};
