const jieba = require('nodejieba');

module.exports = async (ctx) => {
  const { message, reply_to_message: repliedMessage } = ctx;
  let sentence = message.text.trim().replace(/^\S*\s*/, '');
  if (!sentence) {
    if (!repliedMessage) {
      return '用法：`/jieba <句子>` 或者 `/jieba` 回复一条消息';
    }
    sentence = repliedMessage.text;
  }
  if (sentence.length > 64) {
    return '句子太长了！';
  }
  try {
    return jieba.cutHMM(sentence).join(' ');
  } catch (e) {
    return '分词失败！';
  }
};
