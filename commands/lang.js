module.exports = async (ctx) => {
  const { message } = ctx;
  if (!message || !message.reply_to_message) {
    return '请引用一条消息进行操作。';
  }

  if (!message.reply_to_message.entities) {
    return '没有找到代码块。';
  }
  
  const languages = message.reply_to_message.entities
    .map(k => k.language)
    .filter(k => k)
    .join(', ');
  
  if (!languages) return '没有找到代码块。';

  return '这段代码使用了以下语言（由发送者声明）：\n' +languages;
};
