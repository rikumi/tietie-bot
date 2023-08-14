const { setAlias, getAlias } = require('../modules/database');

module.exports = async (ctx) => {
  const [name, target] = ctx.message.text.split(/\s+/).slice(1);
  if (!name) {
    return;
  }
  if (!target) {
    await setAlias(name, '');
    return '已清除该别名。';
  }
  await setAlias(name, target);
  return '已成功设置别名。';
};
