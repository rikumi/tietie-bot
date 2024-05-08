import { GenericMessage } from 'src/clients/base';
import { pickDrink } from '../database/drinks';

export const USAGE = `随机选择一种饮料`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const drink = await pickDrink(message.chatId);
  return drink ? drink + '！' : '没有好喝的😭';
};
