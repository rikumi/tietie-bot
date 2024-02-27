import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS tietie (
    chat_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
};

export const setTietieEnabled = async (chatId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM tietie WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE tietie SET enabled = ? WHERE chat_id = ?`, [+isEnabled, chatId]);
  } else {
    await db.run(`INSERT INTO tietie (chat_id, enabled) VALUES (?, ?)`, [chatId, +isEnabled]);
  }
};

export const isTietieEnabled = async (chatId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM tietie WHERE chat_id = ?`, [chatId]);
  return !record || !!record.enabled;
};
