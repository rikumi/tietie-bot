import fs from 'fs';
import path from 'path';
import { setAlias, getAlias } from '../database/alias';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `<name> [target] 设置指令的别名`;

export const handleMessage = async (message: GenericMessage) => {
  if (!message.text.startsWith('/')) {
    return false;
  }
  const [alias, ...args] = message.text.slice(1).split(/\s+/);
  const targetCommand = await getAlias(message.clientName, message.chatId, alias);
  if (!targetCommand) {
    return false;
  }
  message.text = `/${targetCommand} ${args.join(' ')}`;
  return true;
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const chatId = String(message.chatId);
  const [name, ...target] = message.text!.split(/\s+/).slice(1);

  if (!name) {
    return '用法：/alias <别名> <目标指令> [...预设参数]';
  }
  if (!/^\w+$/.test(name) || fs.existsSync(path.resolve(__dirname, `${name}.js`))) {
    return '别名无效。';
  }
  if (!target.length) {
    if (!await getAlias(message.clientName, chatId, name)) {
      return '该别名不存在，可重新设置。';
    }
    await setAlias(message.clientName, chatId, name, '');
    return '已清除该别名。';
  }
  await setAlias(message.clientName, chatId, name, target.join(' '));
  return '已成功设置别名。';
};
