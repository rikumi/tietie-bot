import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS autodel (
    user_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
};

export const setAutodelEnabled = async (userId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM autodel WHERE user_id = ?`, [userId]);
  if (exists) {
    await db.run(`UPDATE autodel SET enabled = ? WHERE user_id = ?`, [+isEnabled, userId]);
  } else {
    await db.run(`INSERT INTO autodel (user_id, enabled) VALUES (?, ?)`, [userId, +isEnabled]);
  }
};

export const isAutodelEnabled = async (userId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM autodel WHERE user_id = ?`, [userId]);
  return record && !!record.enabled;
};
