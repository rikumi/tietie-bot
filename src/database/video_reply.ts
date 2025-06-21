import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS video_reply (
    id INTEGER PRIMARY KEY,
    group_id TEXT NOT NULL,
    command TEXT NOT NULL,
    video_id TEXT NOT NULL,
    client_name TEXT NOT NULL
  )`);
};

export const setVideoReply = async (clientName: string, chatId: string, command: string, videoId: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM video_reply WHERE client_name = ? AND group_id = ? AND command = ?`, [clientName, chatId, command]);
  if (exists) {
    await db.run(`UPDATE video_reply SET video_id = ? WHERE client_name = ? AND group_id = ? AND command = ?`, [videoId, clientName, chatId, command]);
  } else {
    await db.run(`INSERT INTO video_reply (client_name, group_id, command, video_id) VALUES (?, ?, ?, ?)`, [clientName, chatId, command, videoId]);
  }
};

export const getVideoReply = async (clientName: string, chatId: string, command: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT video_id FROM video_reply WHERE client_name = ? AND group_id = ? AND command = ?`, [clientName, chatId, command]);
  return record && record.video_id;
};

export const pickVideo = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  const count = (await db.get(`SELECT count(*) FROM video_reply WHERE client_name = ? AND group_id = ?`, [clientName, chatId]))['count(*)'];
  if (count === 0) return;
  const index = Math.floor(Math.random() * count);
  const record = await db.get(`SELECT video_id FROM video_reply WHERE client_name = ? AND group_id = ? LIMIT 1 OFFSET ?`, [clientName, chatId, index]);
  return record.video_id;
};
