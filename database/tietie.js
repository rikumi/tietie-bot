const { getDatabase } = require('.');

getDatabase().then(db => {
  db.run(`CREATE TABLE IF NOT EXISTS tietie (
    chat_id INT NOT NULL,
    enabled INT NOT NULL
  )`);
});

const setTietieEnabled = async (chatId, isEnabled) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM tietie WHERE chat_id = ?`, [chatId]);
  if (exists) {
    await db.run(`UPDATE tietie SET enabled = ? WHERE chat_id = ?`, [+isEnabled, chatId]);
  } else {
    await db.run(`INSERT INTO tietie (chat_id, enabled) VALUES (?, ?)`, [chatId, +isEnabled]);
  }
};

const isTietieEnabled = async (groupId) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT enabled FROM tietie WHERE chat_id = ?`, [groupId]);
  return !record || !!record.enabled;
};

module.exports = {
  isTietieEnabled,
  setTietieEnabled,
};
