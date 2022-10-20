const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const startDatabase = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS drinks (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`);
  });
};

const addDrink = (names) => {
  names.forEach((name) => {
    db.run(`INSERT INTO drinks (name) VALUES (?)`, name);
  });
};

const showDrinks = () => {
  return new Promise((res, rej) => {
    db.all(`SELECT name FROM drinks`, (err, rows) => {
      const drinkNames = rows.map((e) => e.name);
      res(drinkNames);
    });
  });
};

module.exports = { startDatabase, addDrink, showDrinks };
