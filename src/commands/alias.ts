import fs from 'fs';
import path from 'path';
import { setAlias, getAlias } from '../database/alias';
import { ICommonMessageContext } from 'typings';

export const handleMessage = async (ctx: ICommonMessageContext) => {
  if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith('/')) {
    return false;
  }
  const [alias, ...args] = ctx.message.text.slice(1).split(/\s+/);
  const chatId = String(ctx.message.chat.id);
  const targetCommand = await getAlias(chatId, alias);
  if (!targetCommand) {
    return false;
  }
  ctx.message.text = `/${targetCommand} ${args.join(' ')}`;
  return true;
};

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const chatId = String(ctx.message.chat.id);
  const [name, ...target] = ctx.message.text!.split(/\s+/).slice(1);

  if (!name) {
    return '用法：/alias <别名> <目标指令> [...预设参数]';
  }
  if (!/^\w+$/.test(name) || fs.existsSync(path.resolve(__dirname, `${name}.js`))) {
    return '别名无效。';
  }
  if (!target.length) {
    if (!await getAlias(chatId, name)) {
      return '该别名不存在，可重新设置。';
    }
    await setAlias(chatId, name, '');
    return '已清除该别名。';
  }
  await setAlias(chatId, name, target.join(' '));
  return '已成功设置别名。';
};
