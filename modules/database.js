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
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    contributor INTEGER NOT NULL
  )`);

  await db.run(`CREATE TABLE IF NOT EXISTS character_opt_out (
    username TEXT PRIMARY KEY
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

const appendCharacter = async (username, message, contributor) => {
  username = username.toLowerCase();
  message = message.slice(0, 140);
  const db = await getDatabase();
  await db.run(`INSERT INTO character (username, message, contributor) VALUES (?, ?, ?)`, [username, message, contributor]);
  const { count } = await db.get(`SELECT count(*) count FROM character WHERE username = ? AND message = ?`, [username, message]);
  if (count > 50) {
    await db.run(`DELETE FROM character WHERE username = ? LIMIT ?`, [username, count - 50]);
  }
};

const hasCharacter = async (username) => {
  username = username.toLowerCase();
  const db = await getDatabase();
  const existing = await db.get(`SELECT * FROM character WHERE username = ?`, [username]);
  return !!existing;
}

const clearCharacter = async (username, keyword = '') => {
  username = username.toLowerCase();
  const db = await getDatabase();
  if (!keyword) {
    await db.run(`DELETE FROM character WHERE username = ?`, [username]);
  } else {
    await db.run(`DELETE FROM character WHERE username = ? AND message LIKE ?`, [username, '%' + keyword + '%']);
  }
};

const getCharacterMessages = async (username) => {
  username = username.toLowerCase();
  const db = await getDatabase();
  const result = await db.all(`SELECT message FROM character WHERE username = ?`, [username]);
  return result.map(record => record.message);
};

const isCharacterOptOut = async (username) => {
  const db = await getDatabase();
  const existing = await db.get(`SELECT * FROM character_opt_out WHERE username = ?`, [username]);
  return !!existing;
};

const setCharacterOptOut = async (username, optOut) => {
  const db = await getDatabase();
  const existing = await db.get(`SELECT * FROM character_opt_out WHERE username = ?`, [username]);
  if (optOut) {
    if (existing) return false;
    await db.run(`INSERT INTO character_opt_out (username) values (?)`, [username]);
    return true;
  }
  if (!existing) return false;
  await db.run(`DELETE FROM character_opt_out WHERE username = ?`, [username]);
  return true;
};

module.exports = {
  getDatabase, startDatabase,
  getChatGPTSystemMessage, setChatGPTSystemMessage,
  checkDrinks, addDrink, pickDrink,
  setVideoReply, getVideoReply, pickVideo,
  setAlias, getAlias,
  appendCharacter, hasCharacter, clearCharacter, getCharacterMessages, setCharacterOptOut, isCharacterOptOut,
};
