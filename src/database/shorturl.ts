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
  while (true) {
    id = crypto.randomBytes(4).toString('hex').toLowerCase();
    const exists = await getOriginalUrl(id);
    if (!exists) break;
  }
  await db.run(`INSERT INTO short_url (id, url) VALUES (?, ?)`, [id, url]);
  return `https://${config.serverRoot}/s/${id}`;
};

export const getOriginalUrl = async (id: string) => {
  const db = await getDatabase();
  return (await db.get(`SELECT * FROM short_url WHERE id = ?`, [id]))?.url;
};
