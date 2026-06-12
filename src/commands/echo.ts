import defaultClientSet from 'src/clients';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `显示被引用的消息的 text`;

export const handleSlashCommand = async (message: GenericMessage | undefined) => {
  if (!message?.messageReplied) {
    return '回复给其它消息以查看 text';
  }
  try {
    await defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      messageIdReplied: message.messageId,
      text: message.messageReplied.text ?? '',
      entities: [{ type: 'expandable_blockquote', offset: 0, length: Buffer.from(message.messageReplied.text ?? '', 'utf16le').length / 2 }],
    });
  } catch (e) {
    return '回显消息文字失败：' + (e?.message ?? '未知错误');
  }
};
