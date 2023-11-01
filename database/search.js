const path = require('path');
const crypto = require('crypto');

const getSearchDatabase = async (chatId) => {
  const { Database } = await import('sqlite-async');
  chatId = formatChatId(chatId);
  const db = await Database.open(path.resolve(__dirname, `../search-v2-${chatId}.db`));
  await db.run(`CREATE TABLE IF NOT EXISTS search (
    message_id INT NOT NULL,
    hashed_keyword TEXT NOT NULL,
    unixtime INT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_id_index ON search (message_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_kw_index ON search (hashed_keyword, unixtime)`);
  return db;
}

const hashKeyword = (chatId, keyword) => {
  chatId = formatChatId(chatId);
  return crypto.createHash('sha256').update(chatId + '|' + keyword).digest('hex').substring(0, 8); // 不怕碰撞
};

const formatChatId = (chatId) => {
  if (chatId === 'imported') {
    return chatId;
  }
  return parseInt(/\d+/.exec(String(chatId).replace(/^-100/, ''))[0]);
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
  await db.run(`DELETE FROM search WHERE message_id = ?`, messageId);
};

const getMessageCount = async (chatId) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT DISTINCT COUNT(message_id) count FROM search`);
  return result.message_id;
}

module.exports = {
  formatChatId,
  putSearchData,
  updateMessageById,
  deleteMessageById,
  generateSearchResultsByKeyword,
  getMessageCount,
};
