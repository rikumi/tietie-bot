import { DefaultClientSet } from 'src/clients';
import { GenericMessage } from 'src/clients/base';
import { getBidirectionalBridgesByChat, registerBidirectionalBridge, removeBidirectionalBridge } from 'src/database/bridge';
import config from '../../config.json';

export const USAGE = `<platform> <chatId> | rm | list 在多个会话之间建立绑定关系`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const [clientName, chatId] = message.text.split(/\s+/).slice(1);
  if (clientName === 'rm') {
    await removeBidirectionalBridge(message.clientName, message.chatId);
    return '已解除绑定当前会话';
  }
  if (clientName === 'list') {
    const bridges = await getBidirectionalBridgesByChat(message.clientName, message.chatId);
    if (!bridges) {
      return '当前会话未绑定到任何会话';
    }
    const bridgeListStr = bridges.map(({ fromClient, fromChatId, toClient, toChatId }) => {
      const format = (clientName: string, chatId: string) => clientName === message.clientName && chatId === message.chatId ? '当前会话' : `${clientName}: ${chatId}`;
      return `- 从 ${format(fromClient, fromChatId)} 转发至 ${format(toClient, toChatId)}`;
    }).join('\n');
    return `当前会话有如下绑定关系：\n\n${bridgeListStr}\n\n请注意，具有间接绑定关系的会话之间不会发生消息互通。`;
  }
  if (!clientName || !chatId) {
    return `请在另一会话中输入 /bridge ${message.clientName} ${message.chatId} 以绑定，或在另一会话中输入 /bridge 以在当前会话进行绑定`;
  }
  if (!(DefaultClientSet.CLIENT_NAMES as readonly string[]).includes(clientName)) {
    return '平台名无效，请使用正确的平台名继续绑定';
  }
  await registerBidirectionalBridge(message.clientName, message.chatId, clientName, chatId);
  const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;
  return [
    `已尝试双向绑定到会话 ${clientName}: ${chatId}`,
    '',
    clientName === 'discord-bot' ? `点击链接邀请 Bot 到 Discord 服务器（如果是带锁频道，请给予加入权限）：\n${serverRoot}/discord-invite\n$}` : '',
    ].join('\n').trim();
};
