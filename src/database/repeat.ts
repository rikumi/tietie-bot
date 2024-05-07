import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS repeat (
    chat_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
  await db.run(`ALTER TABLE repeat ADD COLUMN client_name TEXT NOT NULL DEFAULT 'telegram'`).catch();
};

export const setRepeatEnabled = async (clientName: string, chatId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM repeat WHERE client_name = ? AND chat_id = ?`, [clientName, chatId]);
  if (exists) {
    await db.run(`UPDATE repeat SET enabled = ? WHERE client_name = ? AND chat_id = ?`, [+isEnabled, clientName, chatId]);
  } else {
    await db.run(`INSERT INTO repeat (client_name, chat_id, enabled) VALUES (?, ?, ?)`, [clientName, chatId, +isEnabled]);
  }
};

export const isRepeatEnabled = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM repeat WHERE client_name = ? AND chat_id = ?`, [clientName, chatId]);
  return record && !!record.enabled;
};
