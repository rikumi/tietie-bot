import { ICommonMessageContext } from 'typings';
import { setAutodelEnabled, isAutodelEnabled } from '../database/autodel';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const str = ctx.message.text!.split(/\s+/)[1];
  const userId = String(ctx.message.from.id);
  if (!['on', 'off'].includes(str)) {
    return '用法: /autodel <on|off>';
  }
  if (str === 'on') {
    if (await isAutodelEnabled(userId)) {
      return '已为你开启过自动删除源指令功能。';
    }
    await setAutodelEnabled(userId, true);
    return '已为你开启自动删除源指令功能，将会在任意群尽可能删除你的源「贴贴」、「/me」指令消息，只保留 Bot 的回复消息。';
  } else {
    if (!await isAutodelEnabled(userId)) {
      return '已为你关闭过自动删除源指令功能。';
    }
    await setAutodelEnabled(userId, false);
    return '已为你关闭自动删除源指令功能。';
  }
};
