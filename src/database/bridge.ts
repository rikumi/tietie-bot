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
