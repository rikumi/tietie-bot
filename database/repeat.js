const { getDatabase } = require('.');

getDatabase().then(db => {
  db.run(`CREATE TABLE IF NOT EXISTS repeat (
    chat_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
});

const setRepeatEnabled = async (chatId, isEnabled) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM repeat WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE repeat SET enabled = ? WHERE chat_id = ?`, [+isEnabled, chatId]);
  } else {
    await db.run(`INSERT INTO repeat (chat_id, enabled) VALUES (?, ?)`, [chatId, +isEnabled]);
  }
};

const isRepeatEnabled = async (groupId) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM repeat WHERE chat_id = ?`, [groupId]);
  return record && !!record.enabled;
};

module.exports = {
  isRepeatEnabled,
  setRepeatEnabled,
};
