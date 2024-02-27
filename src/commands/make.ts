import { ICommonMessageContext } from 'typings';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  let sentence = message.text!.trim().replace(/^\S*\s*/, '');
  if (!sentence) {
    return 'make: *** no targets specified.  Stop.';
  }
  return `make: *** don't know how to make ${sentence}.  Stop.`;
};
