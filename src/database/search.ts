import path from 'path';
import crypto from 'crypto';
import { IDatabase, getDatabase as getSharedDatabase } from '.';

const databaseMap = new Map<string, IDatabase>();

const getSearchDatabase = async (chatId: string): Promise<IDatabase> => {
  // @ts-ignore
  const { Database } = await import('sqlite-async');
  chatId = formatChatId(chatId);
  if (databaseMap.has(chatId)) return databaseMap.get(chatId)!;
  const db = await Database.open(path.resolve(__dirname, `../search-v2-${chatId}.db`));
  databaseMap.set(chatId, db);

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

export const init = async () => {
  const db = await getSharedDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS group_fuzzy (
    chat_id INT NOT NULL,
    group_name TEXT NOT NULL
  )`);
};

const hashKeyword = (chatId: string, keyword: string) => {
  chatId = formatChatId(chatId);
  return crypto.createHash('sha256').update(chatId + '|' + keyword).digest('hex').substring(0, 8); // 不怕碰撞
};

export const formatChatId = (chatId: string | number) => {
  try {
    return String(chatId).replace(/^-100/, '').replace(/[^\w]+/g, '_');
  } catch (e) {
    return '0';
  }
};

export const putSearchData = async (chatId: string, messageId: string, keywords: string[], unixtime: number) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const stmt = await db.prepare(`INSERT INTO search (message_id, hashed_keyword, unixtime) VALUES (?, ?, ?)`);
  for (const keyword of keywords) {
    await stmt.run([messageId, hashKeyword(chatId, keyword), Math.floor(Number(unixtime))]);
  }
  await stmt.finalize();
};

export async function* generateSearchResultsByKeyword(chatId: string, keyword: string) {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const stmt = await db.prepare(`SELECT message_id, unixtime FROM search WHERE hashed_keyword = ? ORDER BY unixtime DESC LIMIT 1 OFFSET ?`);
  let offset = 0;
  const hashedKeyword = hashKeyword(chatId, keyword);
  console.log('搜索关键词', hashedKeyword);
  while (true) {
    const row = await stmt.get([hashedKeyword, offset++]);
    if (!row) break;
    console.log('搜索结果', row);
    yield {
      message_id: row.message_id,
      unixtime: row.unixtime,
    };
  }
}

export const updateMessageById = async (chatId: string, messageId: string, newKeywords: string[], unixtime: number) => {
  chatId = formatChatId(chatId);
  await deleteMessageById(chatId, messageId);
  await putSearchData(chatId, messageId, newKeywords, unixtime);
};

export const deleteMessageById = async (chatId: string, messageId: string) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  await db.run(`DELETE FROM search WHERE message_id = ?`, [messageId]);
};

export const getMessageCountByKeyword = async (chatId: string, keyword: string) => {
  chatId = formatChatId(chatId);
  const hashedKeyword = hashKeyword(chatId, keyword);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(DISTINCT message_id) count FROM search WHERE hashed_keyword = ?`, [hashedKeyword]);
  return result.count;
};

export const getMessageCount = async (chatId: string) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(DISTINCT message_id) count FROM search`);
  return result.count;
};

export const updateSearchAccess = async (chatId: string, userId: string) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const hashedUserId = hashKeyword(chatId, userId);
  await db.run(`DELETE FROM search_access WHERE user_id_hash = ? OR unixtime < ?`, [hashedUserId, Math.floor(Date.now() / 1000) - 60 * 60 * 24]);
  await db.run(`INSERT INTO search_access (user_id_hash, unixtime) VALUES (?, ?)`, [hashedUserId, Math.floor(Date.now() / 1000)]);
};

export const checkSearchAccess = async (chatId: string, userId: string) => {
  chatId = formatChatId(chatId);
  const db = await getSearchDatabase(chatId);
  const result = await db.get(`SELECT COUNT(*) count FROM search_access WHERE user_id_hash = ? AND unixtime >= ?`, [hashKeyword(chatId, userId), Math.floor(Date.now() / 1000) - 60 * 60 * 24]);
  return result.count > 0;
};

export const updateGroupInfo = async (chatId: string, groupName: string) => {
  chatId = formatChatId(chatId);
  const sharedDB = await getSharedDatabase();
  const existing = await sharedDB.get(`SELECT * FROM group_fuzzy WHERE chat_id = ?`, [chatId]);
  if (existing) {
    await sharedDB.run(`UPDATE group_fuzzy SET group_name = ? WHERE chat_id = ?`, [groupName, chatId]);
  } else {
    await sharedDB.run(`INSERT INTO group_fuzzy (group_name, chat_id) VALUES (?, ?)`, [groupName, chatId]);
  }
};

export const findAccessibleChatIds = async (keywordOrChatId: string, userId: string) => {
  // exact match
  if (/^-?\d{9,}$/.test(keywordOrChatId)) {
    const chatId = formatChatId(keywordOrChatId);
    return (await checkSearchAccess(chatId, userId)) ? [chatId] : [];
  }
  // fuzzy search
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

export const getGroupNameForChatId = async (chatId: string) => {
  chatId = formatChatId(chatId);
  const sharedDB = await getSharedDatabase();
  const result = await sharedDB.get(`SELECT group_name FROM group_fuzzy WHERE chat_id = ?`, [chatId]);
  return result?.group_name;
};
