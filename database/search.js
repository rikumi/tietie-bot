const path = require('path');
const crypto = require('crypto');

const dbPromise = (async () => {
  const { Database } = await import('sqlite-async');
  return await Database.open(path.resolve(__dirname, '../search.db'));
})();

const getSearchDatabase = () => dbPromise;

getSearchDatabase().then(async db => {
  await db.run(`CREATE TABLE IF NOT EXISTS search (
    chat_id INT NOT NULL,
    message_id INT NOT NULL,
    hashed_keyword TEXT NOT NULL,
    timestamp INT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_id_index ON search (chat_id, message_id)`);
  await db.run(`CREATE INDEX IF NOT EXISTS search_kw_index ON search (chat_id, hashed_keyword, timestamp)`);
});

const hashKeyword = (chatId, keyword) => {
  chatId = parseInt(chatId);
  return crypto.createHash('sha256').update(chatId + '|' + keyword).digest('hex').substring(0, 8); // 不怕碰撞
}

const putSearchData = async (chatId, messageId, keywords, timestamp) => {
  chatId = parseInt(chatId);
  const db = await getSearchDatabase();
  const stmt = await db.prepare(`INSERT INTO search (chat_id, message_id, hashed_keyword, timestamp) VALUES (?, ?, ?, ?)`);
  for (const keyword of keywords) {
    await stmt.run(chatId, messageId, hashKeyword(chatId, keyword), timestamp);
  }
  await stmt.finalize();
};

async function* generateSearchResultsByKeyword(chatId, keyword) {
  chatId = parseInt(chatId);
  const db = await getSearchDatabase();
  const stmt = await db.prepare(`SELECT message_id, timestamp FROM search WHERE chat_id = ? AND hashed_keyword = ? ORDER BY timestamp DESC LIMIT 1 OFFSET ?`);
  let offset = 0;
  const hashedKeyword = hashKeyword(chatId, keyword);
  console.log('搜索关键词', hashedKeyword);
  while (true) {
    const row = await stmt.get(chatId, hashedKeyword, offset++);
    if (!row) break;
    console.log('搜索结果', row);
    yield {
      chat_id: chatId,
      message_id: row.message_id,
      timestamp: row.timestamp,
    };
  }
}

const updateMessageById = async (chatId, messageId, newKeywords, timestamp) => {
  chatId = parseInt(chatId);
  await deleteMessageById(chatId, messageId);
  await putSearchData(chatId, messageId, newKeywords, timestamp);
};

const deleteMessageById = async (chatId, messageId) => {
  chatId = parseInt(chatId);
  const db = await getSearchDatabase();
  await db.run(`DELETE FROM search WHERE chat_id = ? AND message_id = ?`, chatId, messageId);
};

const fixTimestamps = async () => {
  const db = await getSearchDatabase();
  while (true) {
    const record = await db.get(`SELECT rowid, * FROM search WHERE TYPEOF(timestamp) != 'integer' LIMIT 1`, []);
    if (!record) return;
    const newDate = new Date(record.timestamp).getTime();
    await db.run(`UPDATE search SET timestamp = ? WHERE rowid = ?`, [newDate, record.rowid]);
    console.log('已修正 timestamp：', record.timestamp, '->', newDate, new Date(newDate));
  }
}

module.exports = {
  putSearchData,
  updateMessageById,
  deleteMessageById,
  generateSearchResultsByKeyword,
};

fixTimestamps();
