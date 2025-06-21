import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { getAutoReact, setAutoReact } from 'src/database/autoreact';
import config from '../../config.json';

export const USAGE = `<keyword> <emoji> 为本会话中的特定关键词消息设置自动回应`;

export const handleMessage = async (message: GenericMessage) => {
  if (message.text.startsWith('/')) {
    return false;
  }
  const records = await getAutoReact(message.clientName, message.chatId);
  const firstOccur = records.sort((a, b) => message.text.indexOf(a.keyword) - message.text.indexOf(b.keyword))[0];
  if (!firstOccur || !message.text.includes(firstOccur.keyword)) {
    return false;
  }
  defaultClientSet.reactToMessage(message, firstOccur.emoji, config.generalName);
  return true;
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const [, keyword, emoji] = message.text.trim().split(/\s+/);
  if (!keyword || !emoji) {
    return `用法：${USAGE}`;
  }
  const customEmoji = (message.platformMessage?.entities as any[])?.find(ent => ent.type === 'custom_emoji');
  await setAutoReact(message.clientName, message.chatId, keyword, customEmoji?.custom_emoji_id || emoji);
  await defaultClientSet.reactToMessage(message, '👌', config.generalName);
  return '';
};
