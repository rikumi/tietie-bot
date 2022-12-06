const path = require('path');

const getDatabase = async () => {
  const { Database } = await import('sqlite-async');
  return await Database.open(path.resolve(__dirname, '../database.db'));
};

const startDatabase = async () => {
  const db = await getDatabase();

  await db.run(`CREATE TABLE IF NOT EXISTS chatgpt (
    group_id INTEGER PRIMARY KEY,
    token text NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL
  )`);
}

const getChatGPTToken = async (groupId) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT token FROM chatgpt WHERE group_id = ?`, groupId);
  return record && record.token;
};

const setChatGPTToken = async (groupId, token) => {
  const db = await getDatabase();
  return await db.run(`INSERT INTO chatgpt (group_id, token) VALUES (?, ?) ON CONFLICT REPLACE`, [groupId, token]);
};

const checkDrinks = async (names, groupId) => {
  const db = await getDatabase();
  const length = names.length;
  return await db.all(`SELECT name FROM drinks WHERE name IN (${Array(length).fill('?').join(', ')}) AND group_id = ?`, [...names, groupId]);
};

const addDrink = async (names, groupId) => {
  const db = await getDatabase();
  return await Promise.all(names.map(async (name) => {
    await db.run(`INSERT INTO drinks (name, group_id) VALUES (?, ?)`, [name, groupId]);
  }));
};

const pickDrink = async (groupId) => {
  const db = await getDatabase();
  const count = (await db.get(`SELECT count(*) FROM drinks WHERE group_id = ?`, groupId))['count(*)'];
  if (count === 0) return;
  const index = Math.floor(Math.random() * count);
  const record = await db.get(`SELECT name FROM drinks WHERE group_id = ? LIMIT 1 OFFSET ?`, [groupId, index]);
  return record.name;
};

module.exports = { getDatabase, startDatabase, getChatGPTToken, setChatGPTToken, checkDrinks, addDrink, pickDrink };
