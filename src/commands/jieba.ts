import jieba from 'nodejieba';
import { GenericMessage } from 'src/clients/base';

export const handleSlashCommand = async (message: GenericMessage) => {
  const repliedMessage = message.rawMessageReplied;
  let sentence = message.text.trim().replace(/^\S*\s*/, '');
  if (!sentence) {
    if (!repliedMessage?.text) {
      return '用法：`/jieba <句子>` 或者 `/jieba` 回复一条消息（后者仅支持 Telegram）';
    }
    sentence = repliedMessage.text;
  }
  if (sentence.length > 64) {
    return '句子太长了！';
  }
  try {
    return jieba.tag(sentence).map(({ word, tag }) => tag === 'x' ? word : `${word}(${tag})`).join('');
  } catch (e) {
    return '分词失败！';
  }
};
