module.exports = async (ctx) => {
  const { message } = ctx;
  if (!message || !message.replied_to_message) {
    return '请引用一条消息进行操作。';
  }
  return message.replied_to_message.entities
    .map(k => k.language)
    .filter(k => k)
    .join(', ') || '没有找到代码块。';
};
