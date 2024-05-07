import { DefaultClientSet } from 'src/clients';
import { GenericMessage } from 'src/clients/base';
import { registerBidirectionalBridge } from 'src/database/bridge';

export const handleSlashCommand = async (message: GenericMessage) => {
  const [clientName, chatId] = message.text.split(/\s+/).slice(1);
  if (!clientName || !chatId) {
    return `请在另一会话中输入 /bridge ${message.clientName} ${message.chatId} 以绑定，或在另一会话中输入 /bridge 以在当前会话进行绑定`;
  }
  if (!(DefaultClientSet.CLIENT_NAMES as readonly string[]).includes(clientName)) {
    return '平台名无效，请使用正确的平台名继续绑定';
  }
  await registerBidirectionalBridge(message.clientName, message.chatId, clientName, chatId);
  return `已尝试双向绑定到会话 ${clientName}: ${chatId}`;
};
