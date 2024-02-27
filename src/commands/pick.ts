import { ICommonMessageContext } from 'typings';

export const handleSlashCommand = (ctx: ICommonMessageContext) => {
  const content = ctx.message.text!.split(/\s+/).slice(1);
  if (content.length === 0) return;
  const random = Math.floor(content.length * Math.random());
  return content[random];
};
