import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    chat_id text NOT NULL,
    user_id TEXT NOT NULL
  )`);
};

export const setMyFoods = async (names: string[], chatId: string, userId: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM foods WHERE chat_id = ? AND user_id = ?`, [chatId, userId]);
  for (const name of names) {
    await db.run(`INSERT INTO foods (name, chat_id, user_id) VALUES (?, ?, ?)`, [name, chatId, userId]);
  }
};

export const getMyFoods = async (chatId: string, userId: string) => {
  const db = await getDatabase();
  const results = await db.all(`SELECT name, count(*) FROM foods WHERE chat_id = ? AND user_id = ? GROUP BY name`, [chatId, userId]);
  return results.map(item => ({
    name: item.name,
    count: item['count(*)'],
  }));
};

export const pickFood = async (chatId: string) => {
  const db = await getDatabase();
  const totalCount = (await db.get(`SELECT count(*) FROM foods WHERE chat_id = ?`, [chatId]))['count(*)'];
  if (totalCount === 0) return;
  const index = Math.floor(Math.random() * totalCount);
  const { name } = await db.get(`SELECT name FROM foods WHERE chat_id = ? LIMIT 1 OFFSET ?`, [chatId, index]);
  const count = (await db.get(`SELECT count(*) FROM foods WHERE chat_id = ? AND name = ?`, [chatId, name]))['count(*)'];
  return { name, count };
};
