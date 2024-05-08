import { GenericMessage } from 'src/clients/base';
import { setAutodelEnabled, isAutodelEnabled } from '../database/autodel';

export const USAGE = `<on|off> 设置自动删除自己触发的贴贴指令`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const str = message.text.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    return '用法: /autodel <on|off>';
  }
  if (str === 'on') {
    if (await isAutodelEnabled(message.userId)) {
      return '已为你开启过自动删除源指令功能。';
    }
    await setAutodelEnabled(message.userId, true);
    return '已为你开启自动删除源指令功能，将会在任意群尽可能删除你的源「贴贴」、「/me」指令消息，只保留 Bot 的回复消息。';
  } else {
    if (!await isAutodelEnabled(message.userId)) {
      return '已为你关闭过自动删除源指令功能。';
    }
    await setAutodelEnabled(message.userId, false);
    return '已为你关闭自动删除源指令功能。';
  }
};
