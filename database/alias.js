const { getDatabase } = require('.');

getDatabase().then(db => {
  db.run(`CREATE TABLE IF NOT EXISTS alias (
    name TEXT NOT NULL,
    target TEXT NOT NULL,
    group_id INT NOT NULL
  )`);
});

const setAlias = async (groupId, name, target) => {
  const db = await getDatabase();
  const exists = await db.get(`SELECT * FROM alias WHERE group_id = ? AND name = ?`, [groupId, name]);
  if (exists) {
    await db.run(`UPDATE alias SET target = ? WHERE group_id = ? AND name = ?`, [target, groupId, name]);
  } else {
    await db.run(`INSERT INTO alias (name, target, group_id) VALUES (?, ?, ?)`, [name, target, groupId]);
  }
};

const getAlias = async (groupId, name) => {
  const db = await getDatabase();
  const record = await db.get(`SELECT target FROM alias WHERE group_id = ? AND name = ?`, [groupId, name]);
  return record && record.target;
};

module.exports = {
  setAlias,
  getAlias,
};
