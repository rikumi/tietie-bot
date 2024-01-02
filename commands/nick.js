const { getDiscordLinks, setDiscordNickname } = require('../database');

module.exports = async (ctx) => {
  const { message } = ctx;
  const link = (await getDiscordLinks()).find(({ chatId }) => chatId === String(message.chat.id));
  if (!link) {
    return;
  }
  const nickname = message.text.trim().split(/\s+/)[1];
  if (!nickname) {
    return '用法：/nick <频道内的昵称>|clear';
  }
  const userFriendlyName = `${message.from.first_name || ''} ${message.from.last_name || ''}`.trim() || message.from.username;
  if (nickname === 'clear') {
    await setDiscordNickname(chat.id, message.from.id, '');
    return `用户 ${userFriendlyName} 的游戏内显示名称已清除。`;
  }
  await setDiscordNickname(chat.id, message.from.id, nickname);
  return `用户 ${userFriendlyName} 将在游戏内显示为 ${nickname}。`;
};
