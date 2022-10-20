const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const startDatabase = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS drinks (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      group_id INTEGER NOT NULL
    )`);
  });
};

const checkDrinks = (names, groupId) => {
  const length = names.length;
  return new Promise((res, rej) => {
    db.all(`SELECT name FROM drinks WHERE name IN (${Array(length).fill('?').join(', ')}) AND group_id = ?`, [...names, groupId], (err, row) => {
      if (err) {
        rej(err);
      } else {
        console.log(row);
        res(row);
      }
    });
  });
};

const addDrink = (names, groupId) => {
  return new Promise((res, rej) => {
    names.forEach((name) => {
      db.run(`INSERT INTO drinks (name, group_id) VALUES (?, ?)`, [name, groupId], (err) => {
        if (err) {
          rej(err);
        } else {
          res(true);
        }
      });
    });
  });
};

const showDrinks = (groupId) => {
  return new Promise((res, rej) => {
    db.all(`SELECT name FROM drinks WHERE group_id = ?`, groupId, (err, rows) => {
      const drinkNames = rows.map((e) => e.name);
      res(drinkNames);
    });
  });
};

module.exports = { startDatabase, checkDrinks, addDrink, showDrinks };
