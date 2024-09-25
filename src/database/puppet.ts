import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS puppet (
    user_id TEXT NOT NULL,
    bot_token TEXT NOT NULL
  )`);
};

export const setPuppet = async (userId: string, botToken: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM puppet WHERE user_id = ?`, [userId]);
  if (exists) {
    await db.run(`UPDATE puppet SET bot_token = ? WHERE user_id = ?`, [botToken, userId]);
  } else {
    await db.run(`INSERT INTO puppet (user_id, bot_token) VALUES (?, ?)`, [userId, botToken]);
  }
};

export const getPuppet = async (userId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT bot_token FROM puppet WHERE user_id = ?`, [userId]);
  return record && record.bot_token;
};

export const delPuppet = async (userId: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM puppet WHERE user_id = ?`, [userId]);
};
