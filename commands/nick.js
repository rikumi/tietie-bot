const { getDiscordLinks, setDiscordNickname, getDiscordNickname } = require('../database/discord');

module.exports = async (ctx) => {
  const { message } = ctx;
  const link = (await getDiscordLinks()).find(({ chatId }) => chatId === String(message.chat.id));
  if (!link) {
    return;
  }
  const userFriendlyName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || message.from.username;
  const nickname = message.text.trim().split(/\s+/)[1];
  if (!nickname) {
    const currentNickname = await getDiscordNickname(message.chat.id, message.from.id);
    return `用户 ${userFriendlyName} 的游戏内显示名称为 ${currentNickname || userFriendlyName}。`;
  }
  if (nickname === 'clear') {
    await setDiscordNickname(message.chat.id, message.from.id, '');
    return `用户 ${userFriendlyName} 的游戏内显示名称已清除。`;
  }
  await setDiscordNickname(message.chat.id, message.from.id, nickname);
  return `用户 ${userFriendlyName} 将在游戏内显示为 ${nickname}。`;
};
