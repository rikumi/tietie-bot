const path = require('path');

const getDatabase = async () => {
  const { Database } = await import('sqlite-async');
  return await Database.open(path.resolve(__dirname, '../database.db'));
};

const startDatabase = async () => {
  const db = await getDatabase();

  await db.run(`CREATE TABLE IF NOT EXISTS chatgpt (
    group_id INTEGER PRIMARY KEY,
    system_message text NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL
  )`);
}

const getChatGPTSystemMessage = async (groupId) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT system_message FROM chatgpt WHERE group_id = ?`, groupId);
  return record && record.system_message;
};

const setChatGPTSystemMessage = async (groupId, systemMessage) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM chatgpt WHERE group_id = ?`, [groupId]);
  if (exists) {
    await db.run(`UPDATE chatgpt SET system_message = ? WHERE group_id = ?`, [systemMessage, groupId]);
  } else {
    await db.run(`INSERT INTO chatgpt (group_id, system_message) VALUES (?, ?)`, [groupId, systemMessage]);
  }
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

module.exports = { getDatabase, startDatabase, getChatGPTSystemMessage, setChatGPTSystemMessage, checkDrinks, addDrink, pickDrink };
