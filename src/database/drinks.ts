import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    group_id INT NOT NULL
  )`);
};

export const checkDrinks = async (names: string[], groupId: string) => {
  const db = await getDatabase();
  const length = names.length;
  return await db.all(`SELECT name FROM drinks WHERE name IN (${Array(length).fill('?').join(', ')}) AND group_id = ?`, [...names, groupId]);
};

export const addDrink = async (names: string[], groupId: string) => {
  const db = await getDatabase();
  return await Promise.all(names.map(async (name) => {
    await db.run(`INSERT INTO drinks (name, group_id) VALUES (?, ?)`, [name, groupId]);
  }));
};

export const pickDrink = async (groupId: string) => {
  const db = await getDatabase();
  const count = (await db.get(`SELECT count(*) FROM drinks WHERE group_id = ?`, [groupId]))['count(*)'];
  if (count === 0) return;
  const index = Math.floor(Math.random() * count);
  const record = await db.get(`SELECT name FROM drinks WHERE group_id = ? LIMIT 1 OFFSET ?`, [groupId, index]);
  return record.name;
};
