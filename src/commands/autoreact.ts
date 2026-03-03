import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { deleteAutoReact, getAutoReact, setAutoReact } from 'src/database/autoreact';
import config from '../../config.json';

export const USAGE = `<keyword> <emoji> | del <keyword> 为本会话中的特定关键词消息设置自动回应`;

export const TELEGRAM_EMOJI = '👍,👎,❤,🔥,🥰,👏,😁,🤔,🤯,😱,🤬,😢,🎉,🤩,🤮,💩,🙏,👌,🕊,🤡,🥱,🥴,😍,🐳,❤‍🔥,🌚,🌭,💯,🤣,⚡,🍌,🏆,💔,🤨,😐,🍓,🍾,💋,🖕,😈,😴,😭,🤓,👻,👨‍💻,👀,🎃,🙈,😇,😨,🤝,✍,🤗,🫡,🎅,🎄,☃,💅,🤪,🗿,🆒,💘,🙉,🦄,😘,💊,🙊,😎,👾,🤷‍♂,🤷,🤷‍♀,😡'.split(',');

export const handleMessage = async (message: GenericMessage) => {
  const records = await getAutoReact(message.clientName, message.chatId);
  const firstOccur = records
    .map(record => ({ ...record, position: message.text.indexOf(record.keyword) }))
    .filter(record => record.position !== -1)
    .sort((a, b) => a.position - b.position)[0];

  if (!firstOccur) {
    return;
  }
  defaultClientSet.reactToMessage(message, firstOccur.emoji_name);
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const [, keyword, emoji] = message.text.trim().split(/\s+/);
  if (!keyword || !emoji) {
    const records = await getAutoReact(message.clientName, message.chatId);
    return [
      `当前会话将根据 ${records.length} 条规则自动回应：`,
      records.map(record => `消息包含 "${record.keyword}": 回应 "${record.emoji_name}"`).join('\n'),
      `使用 /autoreact ${USAGE}`
    ].filter(Boolean).join('\n\n');
  }
  if (keyword === 'del') {
    const keywordToDelete = emoji;
    await deleteAutoReact(message.clientName, message.chatId, keywordToDelete);
  } else {
    if (!TELEGRAM_EMOJI.includes(emoji)) {
      return `请使用 Telegram 支持的 Emoji Reactions 之一：\n${TELEGRAM_EMOJI.join('')}`;
    }
    await setAutoReact(message.clientName, message.chatId, keyword, emoji);
  }
  await defaultClientSet.reactToMessage(message, '👌');
};
