const path = require('path');

const dbPromise = (async () => {
  const { Database } = await import('sqlite-async');
  return await Database.open(path.resolve(__dirname, '../database.db'));
})();

const getDatabase = () => dbPromise;

module.exports = {
  getDatabase,
}

Object.assign(module.exports, {
  ...require('./alias'),
  ...require('./chatgpt'),
  ...require('./discord'),
  ...require('./drinks'),
  ...require('./repeat'),
  ...require('./search'),
  ...require('./video_reply'),
});
