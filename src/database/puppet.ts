import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS puppet_v2 (
    from_client TEXT NOT NULL DEFAULT 'matrix',
    from_user_id TEXT NOT NULL,
    to_client TEXT NOT NULL DEFAULT 'telegram',
    to_user_token TEXT NOT NULL
  )`);
};

export const setPuppet = async (fromClient: string, fromUserId: string, toClient: string, toUserToken: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM puppet_v2 WHERE from_client = ? AND to_client = ? AND from_user_id = ?`, [fromClient, toClient, fromUserId]);
  if (exists) {
    await db.run(`UPDATE puppet_v2 SET to_user_token = ? WHERE from_client = ? AND to_client = ? AND from_user_id = ?`, [toUserToken, fromClient, toClient, fromUserId]);
  } else {
    await db.run(`INSERT INTO puppet_v2 (from_client, to_client, from_user_id, to_user_token) VALUES (?, ?, ?, ?)`, [fromClient, toClient, fromUserId, toUserToken]);
  }
};

export const getPuppet = async (fromClient: string, fromUserId: string, toClient: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT to_user_token FROM puppet_v2 WHERE from_client = ? AND to_client = ? AND from_user_id = ?`, [fromClient, toClient, fromUserId]);
  return record && record.to_user_token;
};

export const delPuppets = async (fromClient: string, fromUserId: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM puppet_v2 WHERE from_client = ? AND from_user_id = ?`, [fromClient, fromUserId]);
};
