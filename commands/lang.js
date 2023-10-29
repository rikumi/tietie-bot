module.exports = async (ctx) => {
  const { message } = ctx;
  return message.entities.map(k => k.language).filter(k => k).join(', ') || '没有找到代码块。';
};
