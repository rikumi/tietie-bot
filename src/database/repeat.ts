import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS repeat (
    chat_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
};

export const setRepeatEnabled = async (chatId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM repeat WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE repeat SET enabled = ? WHERE chat_id = ?`, [+isEnabled, chatId]);
  } else {
    await db.run(`INSERT INTO repeat (chat_id, enabled) VALUES (?, ?)`, [chatId, +isEnabled]);
  }
};

export const isRepeatEnabled = async (chatId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM repeat WHERE chat_id = ?`, [chatId]);
  return record && !!record.enabled;
};
