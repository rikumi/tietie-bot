import { ICommonMessageContext } from 'typings';
import { pickDrink } from '../database/drinks';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const chatId = String(ctx.message.chat.id);
  const drink = await pickDrink(chatId);
  return drink ? drink + '！' : '没有好喝的😭';
};
