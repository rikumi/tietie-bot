import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS tgfile (
    file_unique_id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL
  )`);
};

export const setTelegramFileId = async (fileUniqueId: string, latestFileId: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM tgfile WHERE file_unique_id = ?`, [fileUniqueId]);
  if (exists) {
    await db.run(`UPDATE tgfile SET file_id = ? WHERE file_unique_id = ?`, [latestFileId, fileUniqueId]);
  } else {
    await db.run(`INSERT INTO tgfile (file_unique_id, file_id) VALUES (?, ?)`, [fileUniqueId, latestFileId]);
  }
};

export const getTelegramFileId = async (fileUniqueId: string) => {
  const db = await getDatabase();
  const file = await db.get(`SELECT * FROM tgfile WHERE file_unique_id = ?`, [fileUniqueId]);
  return file?.file_id;
};
