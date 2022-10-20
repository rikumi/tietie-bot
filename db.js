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

const checkDrinks = (names) => {
  const length = names.length;
  return new Promise((res, rej) => {
    db.all(`SELECT name FROM drinks WHERE name IN (${Array(length).fill('?').join(', ')})`, names, (err, row) => {
      if (err) {
        rej(err);
      } else {
        console.log(row);
        res(row);
      }
    });
  });
};

const addDrink = (names) => {
  return new Promise((res, rej) => {
    names.forEach((name) => {
      db.run(`INSERT INTO drinks (name) VALUES (?)`, name, (err) => {
        if (err) {
          rej(err);
        } else {
          res(true);
        }
      });
    });
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

module.exports = { startDatabase, checkDrinks, addDrink, showDrinks };
