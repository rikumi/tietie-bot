import { GenericMessage } from 'src/clients/base';
import { createShortUrl } from 'src/database/shorturl';

export const USAGE = `<url> 缩短一个 url，请勿滥用`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const url = message.text.split(/\s+/)[1];
  return await createShortUrl(url);
};
