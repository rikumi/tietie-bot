import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { getAutoReact, setAutoReact } from 'src/database/autoreact';
import config from '../../config.json';

export const USAGE = `<keyword> <emoji> 为本会话中的特定关键词消息设置自动回应，目前仅支持 Telegram 默认 Reaction 集合中的 emoji`;

const TELEGRAM_EMOJI = '👍,👎,❤,🔥,🥰,👏,😁,🤔,🤯,😱,🤬,😢,🎉,🤩,🤮,💩,🙏,👌,🕊,🤡,🥱,🥴,😍,🐳,❤‍🔥,🌚,🌭,💯,🤣,⚡,🍌,🏆,💔,🤨,😐,🍓,🍾,💋,🖕,😈,😴,😭,🤓,👻,👨‍💻,👀,🎃,🙈,😇,😨,🤝,✍,🤗,🫡,🎅,🎄,☃,💅,🤪,🗿,🆒,💘,🙉,🦄,😘,💊,🙊,😎,👾,🤷‍♂,🤷,🤷‍♀,😡'.split(',');

export const handleMessage = async (message: GenericMessage) => {
  if (message.text.startsWith('/')) {
    return false;
  }
  const records = await getAutoReact(message.clientName, message.chatId);
  const firstOccur = records
    .map(record => ({ ...record, position: message.text.indexOf(record.keyword) }))
    .filter(record => record.position !== -1)
    .sort((a, b) => a.position - b.position)[0];

  if (!firstOccur) {
    return false;
  }
  defaultClientSet.reactToMessage(message, firstOccur.emoji_name, config.generalName);
  return true;
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const [, keyword, emoji] = message.text.trim().split(/\s+/);
  if (!keyword || !emoji || !/^\p{Emoji_Presentation}$/u.test(emoji)) {
    return `用法：${USAGE}`;
  }
  if (!TELEGRAM_EMOJI.includes(emoji)) {
    return 'Telegram 暂时不支持发送该 Reaction，请更换';
  }
  await setAutoReact(message.clientName, message.chatId, keyword, emoji);
  await defaultClientSet.reactToMessage(message, '👌', config.generalName);
};
