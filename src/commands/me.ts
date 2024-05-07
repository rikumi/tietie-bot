import { GenericMessage } from 'src/clients/base';
import telegram from 'src/clients/telegram';
import { isAutodelEnabled } from 'src/database/autodel';

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = message.text!.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const escape = (text: string) => text.replace(/([\u0000-\u007f])/g, '\\$1');
  const shouldAutodel = await isAutodelEnabled(message.userId);
  if (shouldAutodel) {
    telegram.bot.telegram.deleteMessage(message.chatId, Number(message.messageId)).catch();
  }
  return `${message.userName} ${escape(content)}！`;
};
