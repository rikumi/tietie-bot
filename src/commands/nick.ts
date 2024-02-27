import { ICommonMessageContext } from 'typings';
import { getDiscordLinks, setDiscordNickname, getDiscordNickname } from '../database/discord';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const chatId = String(message.chat.id);
  const userId = String(message.from.id);
  const link = (await getDiscordLinks()).find(({ chatId }) => chatId === chatId);
  if (!link) {
    return;
  }
  const userFriendlyName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || message.from.username;
  const nickname = message.text!.trim().split(/\s+/)[1];
  if (!nickname) {
    const currentNickname = await getDiscordNickname(chatId, userId);
    return `用户 ${userFriendlyName} 的游戏内显示名称为 ${currentNickname || userFriendlyName}。`;
  }
  if (nickname === 'clear') {
    await setDiscordNickname(chatId, userId, '');
    return `用户 ${userFriendlyName} 的游戏内显示名称已清除。`;
  }
  await setDiscordNickname(chatId, userId, nickname);
  return `用户 ${userFriendlyName} 将在游戏内显示为 ${nickname}。`;
};
