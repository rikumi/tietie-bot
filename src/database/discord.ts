import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS discord_webhook (
    chat_id TEXT NOT NULL,
    enabled INT NOT NULL
  )`);
};

export const setDiscordWebhookEnabled = async (chatId: string, isEnabled: boolean) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM discord_webhook WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE discord_webhook SET enabled = ? WHERE chat_id = ?`, [+isEnabled, chatId]);
  } else {
    await db.run(`INSERT INTO discord_webhook (chat_id, enabled) VALUES (?, ?)`, [chatId, +isEnabled]);
  }
};

export const isDiscordWebhookEnabled = async (chatId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM discord_webhook WHERE chat_id = ?`, [chatId]);
  return !record || !!record.enabled;
};
