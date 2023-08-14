const { setAlias, getAlias } = require('../modules/database');

module.exports = async (ctx) => {
  const [name, target] = ctx.message.text.split(/\s+/).slice(1);
  
  if (!name || !/^([a-z]+_)*[a-z]+$/.test(name)) {
    return '别名无效。';
  }
  if (!target) {
    await setAlias(name, '');
    return '已清除该别名。';
  }
  if (!/^([a-z]+_)*[a-z]+$/.test(target)) {
    return '别名指向的指令无效。';
  }
  await setAlias(name, target);
  return '已成功设置别名。';
};
