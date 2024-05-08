import { GenericMessage } from 'src/clients/base';

export const USAGE = `删除被引用的贴贴 Bot 消息 (仅支持 Telegram)`;

export const handleSlashCommand = (_: GenericMessage | undefined, ctx: any) => {
  if (!ctx) return;
  const { message } = ctx;
  const replied = message.reply_to_message;
  if (!replied) return;
  ctx.telegram.deleteMessage(replied.chat.id, replied.message_id);
};
