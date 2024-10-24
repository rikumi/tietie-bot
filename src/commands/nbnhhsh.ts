import { GeneralMessage } from '../clients/base';

export const handleSlashCommand = async (message: GeneralMessage) => {
  const text = message.text.replace(/^\S+/, '');
  const res = await fetch('https://lab.magiconch.com/api/nbnhhsh/guess', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return [text, await res.text()].join();
  // return (await res.json()).map(({ name, trans }) => `${name}: ${trans.join(' ')}`).join('\n') || 'bn';
};
