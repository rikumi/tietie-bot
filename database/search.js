const path = require('path');
const crypto = require('crypto');
const { getDatabase: getSharedDatabase } = require('.');

const databaseMap = {};

const getSearchDatabase = async (chatId) => {
  const { Database } = await import('sqlite-async');
  chatId = formatChatId(chatId);
  if (databaseMap[chatId]) return databaseMap[chatId];
  const db = await Database.open(path.resolve(__dirname, `../search-v2-${chatId}.db`));
  databaseMap[chatId] = db;

  await db.run(`CREATE TABLE IF NOT EXISTS search (
    message_id INT NOT NULL,
    hashed_keyword TEXT NOT NULL,
    unixtime INT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_id_index ON search (message_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_kw_index ON search (hashed_keyword, unixtime)`);

  await db.run(`CREATE TABLE IF NOT EXISTS search_access (
    user_id_hash TEXT NOT NULL,
    unixtime INT NOT NULL
  )`);
  return db;
};

getSharedDatabase().then(async (db) => {
  await db.run(`CREATE TABLE IF NOT EXISTS group_fuzzy (
    chat_id INT NOT NULL,
    group_name TEXT NOT NULL
  )`);
});

const hashKeyword = (chatId, keyword) => {
  chatId = formatChatId(chatId);
  return crypto.createHash('sha256').update(chatId + '|' + keyword).digest('hex').substring(0, 8); // 不怕碰撞
};

const formatChatId = (chatId) => {
  try {
    return parseInt(/\d+/.exec(String(chatId).replace(/^-100/, ''))[0]);
  } catch (e) {
    return NaN;
  }
};

const putSearchData = async (chatId, messageId, keywords, unixtime) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const stmt = await db.prepare(`INSERT INTO search (message_id, hashed_keyword, unixtime) VALUES (?, ?, ?)`);
  for (const keyword of keywords) {
    await stmt.run(messageId, hashKeyword(chatId, keyword), Math.floor(Number(unixtime)));
  }
  await stmt.finalize();
};

async function* generateSearchResultsByKeyword(chatId, keyword) {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const stmt = await db.prepare(`SELECT message_id, unixtime FROM search WHERE hashed_keyword = ? ORDER BY unixtime DESC LIMIT 1 OFFSET ?`);
  let offset = 0;
  const hashedKeyword = hashKeyword(chatId, keyword);
  console.log('搜索关键词', hashedKeyword);
  while (true) {
    const row = await stmt.get(hashedKeyword, offset++);
    if (!row) break;
    console.log('搜索结果', row);
    yield {
      message_id: row.message_id,
      unixtime: row.unixtime,
    };
  }
}

const updateMessageById = async (chatId, messageId, newKeywords, unixtime) => {
  chatId = formatChatId(chatId);
  await deleteMessageById(chatId, messageId);
  await putSearchData(chatId, messageId, newKeywords, unixtime);
};

const deleteMessageById = async (chatId, messageId) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  await db.run(`DELETE FROM search WHERE message_id = ?`, [messageId]);
};

const getMessageCountByKeyword = async (chatId, keyword) => {
  chatId = formatChatId(chatId);
  const hashedKeyword = hashKeyword(chatId, keyword);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(DISTINCT message_id) count FROM search WHERE hashed_keyword = ?`, [hashedKeyword]);
  return result.count;
};

const getMessageCount = async (chatId) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(DISTINCT message_id) count FROM search`);
  return result.count;
};

const updateSearchAccess = async (chatId, userId) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const hashedUserId = hashKeyword(chatId, userId);
  await db.run(`DELETE FROM search_access WHERE user_id_hash = ? OR unixtime < ?`, [hashedUserId, Math.floor(Date.now() / 1000) - 60 * 60 * 24]);
  await db.run(`INSERT INTO search_access (user_id_hash, unixtime) VALUES (?, ?)`, [hashedUserId, Math.floor(Date.now() / 1000)]);
};

const checkSearchAccess = async (chatId, userId) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(*) count FROM search_access WHERE user_id_hash = ? AND unixtime >= ?`, [hashKeyword(chatId, userId), Math.floor(Date.now() / 1000) - 60 * 60 * 24]);
  if (Date.now() < Date.parse('2023-11-08T00:00:00.000+08:00')) {
    console.log('checkSearchAccess testing stage dry-run', chatId, userId, result.count > 0);
    return true;
  }
  return result.count > 0;
};

const updateGroupInfo = async (chatId, groupName) => {
  chatId = formatChatId(chatId);
  const sharedDB = await getSharedDatabase();
  const existing = await sharedDB.get(`SELECT * FROM group_fuzzy WHERE chat_id = ?`, [chatId]);
  if (existing) {
    await sharedDB.run(`UPDATE group_fuzzy SET group_name = ? WHERE chat_id = ?`, [groupName, chatId]);
  } else {
    await sharedDB.run(`INSERT INTO group_fuzzy (group_name, chat_id) VALUES (?, ?)`, [groupName, chatId]);
  }
};

const findAccessibleChatIds = async (keywordOrChatId, userId) => {
  if (/^-?\d{9,}$/.test(keywordOrChatId)) {
    const chatId = formatChatId(keywordOrChatId);
    return (await checkSearchAccess(chatId, userId)) ? [chatId] : [];
  }
  const sharedDB = await getSharedDatabase();
  const result = await sharedDB.all(`SELECT * FROM group_fuzzy WHERE group_name LIKE ?`, [`%${keywordOrChatId}%`]);
  const accessibleChatIds = [];
  for (const item of result) {
    if (await checkSearchAccess(item.chat_id, userId)) {
      accessibleChatIds.push(item.chat_id);
    }
  }
  return accessibleChatIds;
};

const getGroupNameForChatId = async (chatId) => {
  chatId = formatChatId(chatId);
  const sharedDB = await getSharedDatabase();
  const result = await sharedDB.get(`SELECT group_name FROM group_fuzzy WHERE chat_id = ?`, [chatId]);
  return result?.group_name;
};

module.exports = {
  formatChatId,
  putSearchData,
  updateMessageById,
  deleteMessageById,
  generateSearchResultsByKeyword,
  getMessageCount,
  getMessageCountByKeyword,
  updateSearchAccess,
  checkSearchAccess,
  updateGroupInfo,
  findAccessibleChatIds,
  getGroupNameForChatId,
};
