import { GeneralMessage } from '../clients/base';

export const handleSlashCommand = async (message: GeneralMessage) => {
  const text = message.messageReplied?.text ?? message.text.replace(/^\S+/, '');
  const res = await fetch('https://lab.magiconch.com/api/nbnhhsh/guess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return (await res.json())
    .filter(k => k.trans)
    .map(({ name, trans }) => `${name}: ${trans.join(', ')}`).join('\n') || 'bn';
};
