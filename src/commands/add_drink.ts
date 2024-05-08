import { addDrink, checkDrinks } from '../database/drinks';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `<name> 添加一种饮料`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = Array.from(
    new Set(message.text.split(/\s+/).slice(1))
  );
  if (content.length === 0) return '不可以什么都不加👊';
  if (content.length > 10) return '什么几把玩意儿，一次加这么多？';
  if (content.some((e) => e.length > 10)) return '什么几把玩意儿，一次加这么长？';
  const value = await checkDrinks(content, message.chatId);
  if (value.some((e) => e !== undefined)) return '这个已经有了👊';
  const result = await addDrink(content, message.chatId);
  return result ? `添加了 ${content.join('，')}！` : `添加失败了😭`;
};
