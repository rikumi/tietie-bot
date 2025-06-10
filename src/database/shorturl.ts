import crypto from 'crypto';
import { getDatabase } from '.';
import config from '../../config.json';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS short_url (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL
  )`);
};

export const createShortUrl = async (url: string) => {
  const db = await getDatabase();
  let id: string;
  for (let index = 0; ; index++) {
    id = crypto.createHash('sha256').update(`${url}|${index}`).digest('hex').substring(0, 8).toLowerCase();
    const exists = await getOriginalUrl(id);
    if (!exists) {
      await db.run(`INSERT INTO short_url (id, url) VALUES (?, ?)`, [id, url]);
      break;
    }
    if (exists === url) break;
  }
  const serverRoot = /^https?:/.test(config.server.host) ? config.server.host : 'https://' + config.server.host;
  return `${serverRoot}/s/${id}`;
};

export const getOriginalUrl = async (id: string) => {
  const db = await getDatabase();
  return (await db.get(`SELECT * FROM short_url WHERE id = ?`, [id]))?.url;
};
