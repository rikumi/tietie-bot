import { getDatabase } from '.';

export const init = async () => {
  const db = await getDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS discord_link_v3 (
    chat_id TEXT NOT NULL,
    discord_channel_id TEXT NOT NULL,
    discord_guild_id TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS discord_nick (
    chat_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL
  )`);
};

export const getDiscordLinks = async () => {
  const db = await getDatabase();
  const result: Record<string, string>[] = await db.all(`SELECT * FROM discord_link_v3`);
  return result.map(({ chat_id, discord_channel_id, discord_guild_id }) => ({
    chatId: chat_id,
    discordChannelId: discord_channel_id,
    discordGuildId: discord_guild_id,
  }));
};

export const setDiscordLink = async (chatId: string, discordChannelId: string, discordGuildId: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM discord_link_v3 WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE discord_link_v3 SET discord_channel_id = ? AND discord_guild_id = ? WHERE chat_id = ?`, [discordChannelId, discordGuildId, chatId]);
  } else {
    await db.run(`INSERT INTO discord_link_v3 (chat_id, discord_channel_id, discord_guild_id) VALUES (?, ?, ?)`, [chatId, discordChannelId, discordGuildId]);
  }
};

export const setDiscordNickname = async (chatId: string, userId: string, nickname: string) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM discord_nick WHERE chat_id = ? AND user_id = ?`, [chatId, userId]);
  if (exists) {
    await db.run(`UPDATE discord_nick SET nickname = ? WHERE chat_id = ? AND user_id = ?`, [nickname, chatId, userId]);
  } else {
    await db.run(`INSERT INTO discord_nick (chat_id, user_id, nickname) VALUES (?, ?, ?)`, [chatId, userId, nickname]);
  }
};

export const getDiscordNickname = async (chatId: string, userId: string) => {
  const db = await getDatabase();
  const result = await db.get(`SELECT * FROM discord_nick WHERE chat_id = ? AND user_id = ?`, [chatId, userId]);
  return result && result.nickname;
};
