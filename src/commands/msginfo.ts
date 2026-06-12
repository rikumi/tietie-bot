import defaultClientSet from 'src/clients';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `显示被引用的消息的原始数据`;

export const handleSlashCommand = (message: GenericMessage | undefined) => {
  if (!message?.messageReplied) {
    return '回复给其它消息以查看消息原始数据';
  }
  const code = JSON.stringify(message.messageReplied, null, 2);
  try {
    await defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      messageIdReplied: message.messageId,
      text: code!,
      entities: [{ type: 'expandable_blockquote', offset: 0, length: Buffer.from(code, 'utf16le').length / 2, codeLanguage: 'json' }],
    });
  } catch (e) {
    return '回显消息结构体失败：' + (e?.message ?? '未知错误');
  }
};
