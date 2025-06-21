import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { getAutoReact, setAutoReact } from 'src/database/autoreact';
import config from '../../config.json';

export const USAGE = `<keyword> <emoji> 为本会话中的特定关键词消息设置自动回应`;

export const CUSTOM_EMOJI_PREFIX = 'custom_emoji:';

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
  const customEmojiId = (message.platformMessage?.entities as any[])?.find(ent => ent.type === 'custom_emoji')?.custom_emoji_id;
  try {
    await defaultClientSet.reactToMessage(message, '👌', config.generalName);
    await setAutoReact(message.clientName, message.chatId, keyword, customEmojiId ? `${CUSTOM_EMOJI_PREFIX}${customEmojiId}` : emoji);
  } catch (e) {
    if (message.chatId.startsWith('-100')) {
      return '当前 Telegram 会话不支持发送该 Reaction，请将对应的 Custom Emoji Pack 设置为群组表情包后再试';
    } else {
      return 'Telegram 不支持发送该 Reaction，请更换';
    }
  }
};
