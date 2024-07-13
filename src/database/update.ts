import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS update_receiver (
    chat_id TEXT NOT NULL,
    enabled INT NOT NULL,
    client_name TEXT NOT NULL
  )`);
};

export const setUpdateReceiverEnabled = async (clientName: string, chatId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM update_receiver WHERE client_name = ? AND chat_id = ?`, [clientName, chatId]);
  if (exists) {
    await db.run(`UPDATE update_receiver SET enabled = ? WHERE client_name = ? AND chat_id = ?`, [+isEnabled, clientName, chatId]);
  } else {
    await db.run(`INSERT INTO update_receiver (client_name, chat_id, enabled) VALUES (?, ?, ?)`, [clientName, chatId, +isEnabled]);
  }
};

export const isUpdateReceiverEnabled = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM update_receiver WHERE client_name = ? AND chat_id = ?`, [clientName, chatId]);
  return record && !!record.enabled;
};

export const getUpdateReceivers = async () => {
  const db = await getDatabase();
  const records = await db.all(`SELECT client_name clientName, chat_id chatId FROM update_receiver WHERE enabled = 1`, []);
  return records;
};
