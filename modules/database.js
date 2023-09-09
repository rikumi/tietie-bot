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

  await db.run(`CREATE TABLE IF NOT EXISTS video_reply (
    id INTEGER PRIMARY KEY,
    group_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    video_id TEXT NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS drinks (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    group_id INTEGER NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS alias (
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    group_id INTEGER NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS character (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    contributor INTEGER NOT NULL
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

const setVideoReply = async (groupId, command, videoId) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM video_reply WHERE group_id = ? AND command = ?`, [groupId, command]);
  if (exists) {
    await db.run(`UPDATE video_reply SET video_id = ? WHERE group_id = ? AND command = ?`, [videoId, groupId, command]);
  } else {
    await db.run(`INSERT INTO video_reply (group_id, command, video_id) VALUES (?, ?, ?)`, [groupId, command, videoId]);
  }
};

const getVideoReply = async (groupId, command) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT video_id FROM video_reply WHERE group_id = ? AND command = ?`, [groupId, command]);
  return record && record.video_id;
};

const pickVideo = async (groupId) => {
  const db = await getDatabase();
  const count = (await db.get(`SELECT count(*) FROM video_reply WHERE group_id = ?`, groupId))['count(*)'];
  if (count === 0) return;
  const index = Math.floor(Math.random() * count);
  const record = await db.get(`SELECT video_id FROM video_reply WHERE group_id = ? LIMIT 1 OFFSET ?`, [groupId, index]);
  return record.video_id;
};

const setAlias = async (groupId, name, target) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM alias WHERE group_id = ? AND name = ?`, [groupId, name]);
  if (exists) {
    await db.run(`UPDATE alias SET target = ? WHERE group_id = ? AND name = ?`, [target, groupId, name]);
  } else {
    await db.run(`INSERT INTO alias (name, target, group_id) VALUES (?, ?, ?)`, [name, target, groupId]);
  }
};

const getAlias = async (groupId, name) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT target FROM alias WHERE group_id = ? AND name = ?`, [groupId, name]);
  return record && record.target;
};

const appendCharacter = async (userId, message, contributor) => {
  const db = await getDatabase();
  await db.run(`INSERT INTO character (user_id, message, contributor) VALUES (?, ?)`, [userId, message, contributor]);
  const { count } = await db.get(`SELECT count(*) count FROM character WHERE user_id = ? AND message = ?`, [userId, message]);
  if (count > 50) {
    await db.run(`DELETE FROM character WHERE user_id = ? LIMIT ?`, [userId, count - 50]);
  }
};

const clearCharacter = async (userId) => {
  const db = await getDatabase();
  const existing = await db.get(`SELECT * FROM character WHERE user_id = ?`, [userId]);
  if (!existing) {
    return false;
  }
  await db.run(`DELETE FROM character WHERE user_id = ?`, [userId]);
  return true;
};

const getCharacterMessages = async (userId) => {
  const result = await db.all(`SELECT message FROM character WHERE user_id = ?`, [userId]);
  return result.map(record => record.message);
};

module.exports = {
  getDatabase, startDatabase,
  getChatGPTSystemMessage, setChatGPTSystemMessage,
  checkDrinks, addDrink, pickDrink,
  setVideoReply, getVideoReply, pickVideo,
  setAlias, getAlias,
  appendCharacter, clearCharacter, getCharacterMessages
};
