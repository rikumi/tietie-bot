import { ICommonMessageContext } from 'typings';
import { addDrink, checkDrinks } from '../database/drinks';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const content = Array.from(
    new Set(ctx.message.text!.split(/\s+/).slice(1))
  );
  const chatId = String(ctx.message.chat.id);
  if (content.length === 0) return '不可以什么都不加👊';
  if (content.length > 10) return '什么几把玩意儿，一次加这么多？';
  if (content.some((e) => e.length > 10)) return '什么几把玩意儿，一次加这么长？';
  const value = await checkDrinks(content, chatId);
  if (value.some((e) => e !== undefined)) return '这个已经有了👊';
  const result = await addDrink(content, chatId);
  return result ? `添加了 ${ content.join('，') }！` : `添加失败了😭`;
};
