import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS chatgpt (
    group_id INTEGER PRIMARY KEY,
    system_message TEXT NOT NULL
  )`);
};

export const getChatGPTSystemMessage = async (groupId: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT system_message FROM chatgpt WHERE group_id = ?`, [groupId]);
  return record && record.system_message;
};

export const setChatGPTSystemMessage = async (groupId: string, systemMessage: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM chatgpt WHERE group_id = ?`, [groupId]);
  if (exists) {
    await db.run(`UPDATE chatgpt SET system_message = ? WHERE group_id = ?`, [systemMessage, groupId]);
  } else {
    await db.run(`INSERT INTO chatgpt (group_id, system_message) VALUES (?, ?)`, [groupId, systemMessage]);
  }
};
