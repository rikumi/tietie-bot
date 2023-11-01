const { getDatabase } = require('.');

getDatabase().then(db => {
  db.run(`CREATE TABLE IF NOT EXISTS discord_link_v2 (
    chat_id TEXT NOT NULL,
    discord_channel_id TEXT NOT NULL
  )`);
});

const getDiscordLinks = async () => {
  const db = await getDatabase();
  const result = await db.all(`SELECT * FROM discord_link_v2`);
  return result.map(({ chat_id, discord_channel_id }) => ({ chatId: chat_id, discordChannelId: discord_channel_id }));
};

const setDiscordLink = async (chatId, discordChannelId) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM discord_link_v2 WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE discord_link_v2 SET discord_channel_id = ? WHERE chat_id = ?`, [discordChannelId, chatId]);
  } else {
    await db.run(`INSERT INTO discord_link_v2 (chat_id, discord_channel_id) VALUES (?, ?)`, [chatId, discordChannelId]);
  }
};

module.exports = {
  getDiscordLinks,
  setDiscordLink,
};
