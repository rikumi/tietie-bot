import { GenericMessage } from 'src/clients/base';
import { setRepeatEnabled, isRepeatEnabled } from '../database/repeat';
import defaultClientSet from 'src/clients';

export const USAGE = `<on|off> 开启/关闭感叹句复读功能`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const str = message.text.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    const current = await isRepeatEnabled(message.clientName, message.chatId);
    return `当前会话感叹句复读功能已${current ? '开启' : '关闭'}，使用 /repeat ${current ? 'off' : 'on'} 来切换`;
  }
  if (str === 'on') {
    await setRepeatEnabled(message.clientName, message.chatId, true);
    return '已为当前会话开启感叹句复读功能。';
  } else {
    await setRepeatEnabled(message.clientName, message.chatId, false);
    return '已为当前会话关闭感叹句复读功能。';
  }
};

export const handleGeneralMessage = async (message: GenericMessage) => {
  const repeatEnabled = await isRepeatEnabled(message.clientName, message.chatId);
  if (!repeatEnabled) {
    return false;
  }
  if (message.text.length > 30) {
    return false;
  }
  if (!message.text.endsWith('！') && !message.text.endsWith('!')) {
    return false;
  }
  let repeatText = message.text.replace(/[!！]+$/, '！');
  if (repeatText.includes('我') && repeatText.includes('你')) {
    repeatText = repeatText.replace(/你/g, '伊').replace(/我/g, '你');
  }
  if (repeatText.includes('我')) {
    repeatText = repeatText.replace(/我/g, '你');
  }
  defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text: `${repeatText}${repeatText}${repeatText}`,
    messageIdReplied: message.messageId,
  });
  return true;
}
