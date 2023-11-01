const fs = require('fs');
const path = require('path');
const { setAlias, getAlias } = require('../database');

module.exports = async (ctx) => {
  const groupId = ctx.message.chat.id;
  const [name, target] = ctx.message.text.split(/\s+/).slice(1);

  if (!name || !/^\w+$/.test(name) || fs.existsSync(path.resolve(__dirname, `${name}.js`))) {
    return '别名无效。';
  }
  if (!target) {
    await setAlias(groupId, name, '');
    return '已清除该别名。';
  }
  if (!/^\w+$/.test(target) || !fs.existsSync(path.resolve(__dirname, `${target}.js`))) {
    return '别名指向的指令无效。';
  }
  await setAlias(groupId, name, target);
  return '已成功设置别名。';
};
