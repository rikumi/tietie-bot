import { GenericMessage } from 'src/clients/base';
import telegram from 'src/clients/telegram';
import { isAutodelEnabled } from 'src/database/autodel';

export const USAGE = `<description> 代表自己说一句话`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = message.text!.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const shouldAutodel = await isAutodelEnabled(message.userId);
  if (shouldAutodel) {
    telegram.bot.telegram.deleteMessage(message.chatId, Number(message.messageId)).catch();
  }
  return `${message.userName} ${content}！`;
};
