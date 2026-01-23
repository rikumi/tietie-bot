import { getDatabase } from '.';

export interface Sticker {
  id: number;
  user_id: string;
  client_name: string;
  name: string;
  telegram_file_id: string;
}

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS stickers (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    name TEXT NOT NULL,
    telegram_file_id TEXT NOT NULL,
    UNIQUE(user_id, client_name, name)
  )`);
};

export const addSticker = async (userId: string, clientName: string, name: string, telegramFileId: string) => {
  const db = await getDatabase();
  await db.run(`INSERT OR REPLACE INTO stickers (user_id, client_name, name, telegram_file_id) VALUES (?, ?, ?, ?)`, [userId, clientName, name, telegramFileId]);
};

export const getSticker = async (userId: string, clientName: string, name: string): Promise<Sticker | undefined> => {
  const db = await getDatabase();
  return await db.get<Sticker>(`SELECT * FROM stickers WHERE user_id = ? AND client_name = ? AND name = ?`, [userId, clientName, name]);
};

export const getUserStickers = async (userId: string, clientName: string): Promise<Sticker[]> => {
  const db = await getDatabase();
  return await db.all<Sticker>(`SELECT * FROM stickers WHERE user_id = ? AND client_name = ?`, [userId, clientName]);
};

export const deleteSticker = async (userId: string, clientName: string, name: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM stickers WHERE user_id = ? AND client_name = ? AND name = ?`, [userId, clientName, name]);
};
