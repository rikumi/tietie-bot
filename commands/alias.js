const fs = require('fs');
const path = require('path');
const { setAlias, getAlias } = require('../database');

const handleSlashCommand = async (ctx) => {
  if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith('/')) {
    return false;
  }
  const [alias, ...args] = ctx.message.text.slice(1).split(/\s+/);
  const targetCommand = await getAlias(ctx.message.chat.id, alias);
  if (!targetCommand) {
    return false;
  }
  ctx.message.text = `/${targetCommand} ${args.join(' ')}`;
  const { message_id: noticeMessageId } = await ctx.reply(`[别名 “${alias}” 已被重定向至 “${targetCommand}”]`);
  setTimeout(() => ctx.telegram.deleteMessage(ctx.message.chat.id, noticeMessageId), 1000);
  return true;
};

module.exports = async (ctx) => {
  const groupId = ctx.message.chat.id;
  const [name, ...target] = ctx.message.text.split(/\s+/).slice(1);

  if (!name) {
    return '用法：/alias <别名> <目标指令> [...预设参数]';
  }
  if (!/^\w+$/.test(name) || fs.existsSync(path.resolve(__dirname, `${name}.js`))) {
    return '别名无效。';
  }
  if (!target.length) {
    if (!await getAlias(groupId, name)) {
      return '该别名不存在，可重新设置。';
    }
    await setAlias(groupId, name, '');
    return '已清除该别名。';
  }
  await setAlias(groupId, name, target.join(' '));
  return '已成功设置别名。';
};

module.exports.handleSlashCommand = handleSlashCommand;
