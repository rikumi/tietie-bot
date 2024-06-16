import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS alias (
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    group_id INT NOT NULL,
    client_name TEXT NOT NULL
  )`);
}

export const setAlias = async (clientName: string, chatId: string, name: string, target: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM alias WHERE client_name = ? AND group_id = ? AND name = ?`, [clientName, chatId, name]);
  if (exists) {
    await db.run(`UPDATE alias SET target = ? WHERE client_name = ? AND group_id = ? AND name = ?`, [target, clientName, chatId, name]);
  } else {
    await db.run(`INSERT INTO alias (client_name, name, target, group_id) VALUES (?, ?, ?, ?)`, [clientName, name, target, chatId]);
  }
};

export const getAlias = async (clientName: string, chatId: string, name: string) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT target FROM alias WHERE client_name = ? AND group_id = ? AND name = ?`, [clientName, chatId, name]);
  return record && record.target;
};
