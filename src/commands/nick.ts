import { GenericMessage } from 'src/clients/base';
import { getBridgeNickname, setBridgeNickname } from 'src/database/bridge';

export const USAGE = `[name] 设置自己转发到其他会话的昵称`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const nickname = message.text!.trim().split(/\s+/)[1];
  if (!nickname) {
    const currentNickname = await getBridgeNickname(message.clientName, message.chatId, message.userId);
    return `用户 ${message.userName} 的互通群显示名称为 ${currentNickname || message.userName}。`;
  }
  if (nickname === 'clear') {
    await setBridgeNickname(message.clientName, message.chatId, message.userId, '');
    return `用户 ${message.userName} 的互通群显示名称已清除。`;
  }
  await setBridgeNickname(message.clientName, message.chatId, message.userId, nickname);
  return `用户 ${message.userName} 将在互通群显示为 ${nickname}。`;
};
