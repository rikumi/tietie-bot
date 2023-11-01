const { getDatabase } = require('.');

getDatabase().then(db => {
  db.run(`CREATE TABLE IF NOT EXISTS video_reply (
    id INTEGER PRIMARY KEY,
    group_id INT NOT NULL,
    command TEXT NOT NULL,
    video_id TEXT NOT NULL
  )`);
});

const setVideoReply = async (groupId, command, videoId) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM video_reply WHERE group_id = ? AND command = ?`, [groupId, command]);
  if (exists) {
    await db.run(`UPDATE video_reply SET video_id = ? WHERE group_id = ? AND command = ?`, [videoId, groupId, command]);
  } else {
    await db.run(`INSERT INTO video_reply (group_id, command, video_id) VALUES (?, ?, ?)`, [groupId, command, videoId]);
  }
};

const getVideoReply = async (groupId, command) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT video_id FROM video_reply WHERE group_id = ? AND command = ?`, [groupId, command]);
  return record && record.video_id;
};

const pickVideo = async (groupId) => {
  const db = await getDatabase();
  const count = (await db.get(`SELECT count(*) FROM video_reply WHERE group_id = ?`, groupId))['count(*)'];
  if (count === 0) return;
  const index = Math.floor(Math.random() * count);
  const record = await db.get(`SELECT video_id FROM video_reply WHERE group_id = ? LIMIT 1 OFFSET ?`, [groupId, index]);
  return record.video_id;
};

module.exports = {
  setVideoReply,
  getVideoReply,
  pickVideo,
};
