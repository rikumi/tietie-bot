import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS autoreact (
    id INTEGER PRIMARY KEY,
    group_id TEXT NOT NULL,
    keyword TEXT NOT NULL,
    emoji_name TEXT NOT NULL,
    client_name TEXT NOT NULL
  )`);
};

export const setAutoReact = async (clientName: string, chatId: string, keyword: string, emojiName: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM autoreact WHERE client_name = ? AND group_id = ? AND keyword = ?`, [clientName, chatId, keyword]);
  if (exists) {
    await db.run(`UPDATE autoreact SET emoji_name = ? WHERE client_name = ? AND group_id = ? AND keyword = ?`, [clientName, emojiName, chatId, keyword]);
  } else {
    await db.run(`INSERT INTO autoreact (client_name, group_id, keyword, emoji_name) VALUES (?, ?, ?, ?)`, [clientName, chatId, keyword, emojiName]);
  }
};

export const getAutoReact = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  return await db.all(`SELECT * FROM autoreact WHERE client_name = ? AND group_id = ?`, [clientName, chatId]);
};
