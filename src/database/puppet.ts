import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS puppet (
    from_client TEXT NOT NULL DEFAULT 'matrix'
    user_id TEXT NOT NULL,
    to_client TEXT NOT NULL DEFAULT 'telegram'
    bot_token TEXT NOT NULL
  )`);
};

export const setPuppet = async (fromClient: string, fromUserId: string, toClient: string, toUserToken: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM puppet WHERE from_client = ? AND to_client = ? AND user_id = ?`, [fromClient, toClient, fromUserId]);
  if (exists) {
    await db.run(`UPDATE puppet SET bot_token = ? WHERE from_client = ? AND to_client = ? AND user_id = ?`, [toUserToken, fromClient, toClient, fromUserId]);
  } else {
    await db.run(`INSERT INTO puppet (from_client, to_client, user_id, bot_token) VALUES (?, ?)`, [fromClient, toClient, fromUserId, toUserToken]);
  }
};

export const getPuppet = async (fromClient: string, fromUserId: string, toClient: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT bot_token FROM puppet WHERE from_client = ? AND to_client = ? AND user_id = ?`, [fromClient, toClient, fromUserId]);
  return record && record.bot_token;
};

export const delPuppet = async (fromClient: string, fromUserId: string, toClient: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM puppet WHERE from_client = ? AND to_client = ? AND user_id = ?`, [fromClient, toClient, fromUserId]);
};
