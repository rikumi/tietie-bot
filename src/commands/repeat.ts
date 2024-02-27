import { ICommonMessageContext, IContext } from 'typings';
import { setRepeatEnabled, isRepeatEnabled } from '../database/repeat';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const str = ctx.message.text!.split(/\s+/)[1];
  const chatId = String(ctx.message.chat.id);
  if (!['on', 'off'].includes(str)) {
    return '用法: /repeat <on|off>';
  }
  if (str === 'on') {
    await setRepeatEnabled(chatId, true);
    return '已为当前会话开启感叹句复读功能。';
  } else {
    await setRepeatEnabled(chatId, false);
    return '已为当前会话关闭感叹句复读功能。';
  }
};

export const handleGeneralMessage = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const chatId = String(ctx.message.chat.id);
  if (!message || !message.text || !message.chat) {
    return false;
  }
  const repeatEnabled = await isRepeatEnabled(chatId);
  if (!repeatEnabled) {
    return false;
  }
  if (message.text.length > 30) {
    return false;
  }
  if (!message.text.endsWith('！') && !message.text.endsWith('!')) {
    return false;
  }
  let repeatText = message.text.replace(/[!！]+$/, '！');
  if (repeatText.includes('我') && repeatText.includes('你')) {
    repeatText = repeatText.replace(/你/g, '伊').replace(/我/g, '你');
  }
  if (repeatText.includes('我')) {
    repeatText = repeatText.replace(/我/g, '你');
  }
  (ctx as IContext).reply(`${repeatText}${repeatText}${repeatText}`, {
    reply_to_message_id: message.message_id,
  });
  return true;
}
