import jieba from 'nodejieba';
import { ICommonMessageContext, IMaybeTextMessage } from 'typings';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const repliedMessage: IMaybeTextMessage | undefined = message.reply_to_message;
  let sentence = message.text!.trim().replace(/^\S*\s*/, '');
  if (!sentence) {
    if (!repliedMessage?.text) {
      return '用法：`/jieba <句子>` 或者 `/jieba` 回复一条消息';
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
