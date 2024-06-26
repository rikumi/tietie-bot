import { GenericMessage } from 'src/clients/base';
import telegram from 'src/clients/telegram';

export const USAGE = `删除被引用的贴贴 Bot 消息 (仅支持 Telegram)`;

export const handleSlashCommand = (message: GenericMessage | undefined) => {
  if (message?.clientName !== 'telegram' || message.messageIdReplied) return;
  telegram.bot.telegram.deleteMessage(message.chatId, Number(message.messageIdReplied));
};
