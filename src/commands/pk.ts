import { GenericMessage } from 'src/clients/base';
import crypto from 'crypto';

export const USAGE = `从给出的多个选项中找出 SHA256 最大的一个`;

const hash = (text: string) => crypto.createHash('sha256').update(string).digest().toString('hex');

export const handleSlashCommand = (message: GenericMessage) => {
  const content = message.text.split(/\s+/).slice(1);
  if (content.length === 0) return;
  return content.reduce((a, b) => hash(b) > hash(a) ? b : a, content[0]);
};
