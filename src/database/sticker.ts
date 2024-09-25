import crypto from 'crypto';
import { getDatabase } from '.';
import { GenericMedia } from 'src/clients/base';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS sticker_favorite (
    user_id_keyword_hash TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INT NOT NULL,
    width INT,
    height INT,
    telegram_file_id TEXT
  )`);
};

export const setFavoriteSticker = async (userId: string, keyword: string, sticker: GenericMedia) => {
  const db = await getDatabase();
  const userKeywordHash = crypto.createHash('sha256').update(`${userId}:${keyword}`).digest('hex');
  await db.run(`INSERT OR REPLACE INTO sticker_favorite (
    user_id_keyword_hash,
    url, mime_type, size,
    width, height, telegram_file_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    userKeywordHash, sticker.url, sticker.mimeType, sticker.size,
    sticker.width, sticker.height, sticker.telegramFileId,
  ]);
};

export const getFavoriteSticker = async (userId: string, keyword: string): Promise<GenericMedia | null> => {
  const db = await getDatabase();
  const userKeywordHash = crypto.createHash('sha256').update(`${userId}:${keyword}`).digest('hex');
  const record = await db.get(`SELECT * FROM sticker_favorite WHERE user_id_keyword_hash = ?`, [userKeywordHash]);
  if (!record) {
    return null;
  }
  const { url, mime_type, size, width, height, telegram_file_id } = record;
  return {
    type: 'sticker',
    url, mimeType: mime_type, size,
    width, height, telegramFileId: telegram_file_id,
  }
};
