import { GenericMessage } from 'src/clients/base';
import { setUpdateReceiverEnabled } from 'src/database/update';

export const USAGE = `<on|off> 开启/关闭自动更新通知`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const str = message.text.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    return '用法: /update_receiver <on|off>';
  }
  if (str === 'on') {
    await setUpdateReceiverEnabled(message.clientName, message.chatId, true);
    return '已为当前会话开启自动更新通知。';
  } else {
    await setUpdateReceiverEnabled(message.clientName, message.chatId, false);
    return '已为当前会话关闭自动更新通知。';
  }
};
