import defaultClientSet, { prependMessageText } from 'src/clients';
import { GenericMessage, MessageToSend } from 'src/clients/base';

export const USAGE = `显示被引用的消息的原始数据`;

export const handleSlashCommand = (message: GenericMessage | undefined) => {
  if (!message?.messageReplied) {
    return '回复给其它消息以查看消息原始数据';
  }
  const code = JSON.stringify(message.messageReplied, null, 2);
  defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    messageIdReplied: message.messageId,
    text: code!,
    entities: [{ type: 'pre', offset: 0, length: Buffer.from(code, 'utf16le').length / 2, codeLanguage: 'json' }],
  });
};
