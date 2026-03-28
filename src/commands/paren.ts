import { GenericMessage } from '../clients/base';
import { setParenEnabled, isParenEnabled } from '../database/paren';
import defaultClientSet from '../clients';

export const USAGE = `<on|off> 开启/关闭括号平衡功能`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const str = message.text.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    const current = await isParenEnabled(message.clientName, message.chatId);
    return `当前会话括号平衡功能已${current ? '开启' : '关闭'}，使用 /paren ${current ? 'off' : 'on'} 来切换`;
  }
  if (str === 'on') {
    await setParenEnabled(message.clientName, message.chatId, true);
    return '已为当前会话开启括号平衡功能。';
  } else {
    await setParenEnabled(message.clientName, message.chatId, false);
    return '已为当前会话关闭括号平衡功能。';
  }
};

export const handleGeneralMessage = async (message: GenericMessage) => {
  const parenEnabled = await isParenEnabled(message.clientName, message.chatId);
  if (!parenEnabled) {
    return false;
  }
  const leftCount = message.text.match(/[(（]/g)?.length ?? 0;
  const rightCount = message.text.match(/[）)]/g)?.length ?? 0;
  if (rightCount >= leftCount) {
    return false;
  }
  const compensateCount = leftCount - rightCount;
  const compensateText = Array(Math.abs(compensateCount)).fill('）').join('');

  defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text: compensateText,
    messageIdReplied: message.messageId,
  });
  return true;
}
