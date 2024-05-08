import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  await db.run(`CREATE TABLE IF NOT EXISTS bridge (
    from_client TEXT NOT NULL,
    from_chat_id TEXT NOT NULL,
    to_client TEXT NOT NULL,
    to_chat_id TEXT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS bridge_index ON bridge (
    from_client,
    from_chat_id
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS recent_bridged_messages (
    from_client TEXT NOT NULL,
    from_message_id TEXT NOT NULL,
    to_client TEXT NOT NULL,
    to_message_id TEXT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS recent_bridged_messages_index ON recent_bridged_messages (
    from_client,
    from_message_id,
    to_client
  )`);
  await db.run(`CREATE TABLE IF NOT EXISTS bridge_nick (
    client_name TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL
  )`);
  await db.run(`CREATE INDEX IF NOT EXISTS bridge_nick_index ON bridge_nick (
    client_name,
    chat_id,
    user_id
  )`);
};

export const getUnidirectionalBridgesByChat = async (fromClient: string, fromChatId: string) => {
  const db = await getDatabase();
  const result = await db.all(`SELECT * FROM bridge WHERE from_client = ? AND from_chat_id = ?`, [fromClient, fromChatId]);
  return result.map(bridge => ({
    toClient: bridge.to_client,
    toChatId: bridge.to_chat_id,
  }));
};

export const getBidirectionalBridgesByChat = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  const result = await db.all(`SELECT * FROM bridge WHERE from_client = ? AND from_chat_id = ? OR to_client = ? AND to_chat_id = ?`, [clientName, chatId, clientName, chatId]);
  return result.map(bridge => ({
    fromClient: bridge.from_client,
    fromChatId: bridge.from_chat_id,
    toClient: bridge.to_client,
    toChatId: bridge.to_chat_id,
  }));
};

export const registerUnidirectionalBridge = async (fromClient: string, fromChatId: string, toClient: string, toChatId: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM bridge WHERE from_client = ? AND from_chat_id = ? AND to_client = ? AND to_chat_id = ?`, [fromClient, fromChatId, toClient, toChatId]);
  if (exists) {
    return;
  }
  await db.run(`INSERT INTO bridge (from_client, from_chat_id, to_client, to_chat_id) VALUES (?, ?, ?, ?)`, [fromClient, fromChatId, toClient, toChatId]);
};

export const registerBidirectionalBridge = async (fromClient: string, fromChatId: string, toClient: string, toChatId: string) => {
  await registerUnidirectionalBridge(fromClient, fromChatId, toClient, toChatId);
  await registerUnidirectionalBridge(toClient, toChatId, fromClient, fromChatId);
};

export const removeUnidirectionalBridge = async (fromClient: string, fromChatId: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM bridge WHERE from_client = ? AND from_chat_id = ?`, [fromClient, fromChatId]);
};

export const removeBidirectionalBridge = async (clientName: string, chatId: string) => {
  const db = await getDatabase();
  await db.run(`DELETE FROM bridge WHERE from_client = ? AND from_chat_id = ? OR to_client = ? AND to_chat_id = ?`, [clientName, chatId, clientName, chatId]);
};

export const recordBridgedMessage = async (fromClient: string, fromMessageId: string, toClient: string, toMessageId: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM recent_bridged_messages WHERE from_client = ? AND from_message_id = ? AND to_client = ? AND to_message_id = ?`, [fromClient, fromMessageId, toClient, toMessageId]);
  if (exists) {
    return;
  }
  await db.run(`INSERT INTO recent_bridged_messages (from_client, from_message_id, to_client, to_message_id) VALUES (?, ?, ?, ?)`, [fromClient, fromMessageId, toClient, toMessageId]);
};

export const getBridgedMessageId = async (fromClient: string, fromMessageId: string, toClient: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM recent_bridged_messages WHERE from_client = ? AND from_message_id = ? AND to_client = ?`, [fromClient, fromMessageId, toClient]);
  if (!exists) {
    return;
  }
  return exists.to_message_id;
};

export const setBridgeNickname = async (clientName: string, chatId: string, userId: string, nickname: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM bridge_nick WHERE client_name = ? AND chat_id = ? AND user_id = ?`, [clientName, chatId, userId]);
  if (exists) {
    await db.run(`UPDATE bridge_nick SET nickname = ? WHERE client_name = ? AND chat_id = ? AND user_id = ?`, [nickname, clientName, chatId, userId]);
  } else {
    await db.run(`INSERT INTO bridge_nick (client_name, chat_id, user_id, nickname) VALUES (?, ?, ?, ?)`, [clientName, chatId, userId, nickname]);
  }
};

export const getBridgeNickname = async (clientName: string, chatId: string, userId: string) => {
  const db = await getDatabase();
  const result = await db.get(`SELECT * FROM bridge_nick WHERE client_name = ? AND chat_id = ? AND user_id = ?`, [clientName, chatId, userId]);
  return result && result.nickname;
};
