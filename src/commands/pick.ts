import { GenericMessage } from 'src/clients/base';

export const USAGE = `从给出的多个选项中随机选择一个`;

export const handleSlashCommand = (message: GenericMessage) => {
  const content = message.text.split(/\s+/).slice(1);
  if (content.length === 0) return;
  const random = Math.floor(content.length * Math.random());
  return content[random];
};
