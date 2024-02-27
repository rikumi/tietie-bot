import { ICommonMessageContext } from 'typings';
import { setChatGPTSystemMessage } from '../database/chatgpt';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const text = message.text!.trim().replace(/^.*?\s+/, '');
  if (!text) return;
  const chatId = String(ctx.message.chat.id);
  await setChatGPTSystemMessage(chatId, text);
  return '设置 prompt 成功';
};
