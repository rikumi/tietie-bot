import fs from 'fs';
import path from 'path';

const checkAndMigrateDatabases = async () => {
  // @ts-ignore
  const { Database } = await import('sqlite-async');
  const databases = fs.readdirSync(path.resolve(__dirname, '../migrate'));
  for (const filename of databases) {
    if (!filename.endsWith('.db')) continue;
    const fromFilePath = path.resolve(__dirname, `../migrate/${filename}`);
    const toFilePath = path.resolve(__dirname, `../${filename}`);
    const tempFilePath = path.resolve(__dirname, `../${filename.replace(/\.db$/, '.temp.db')}`);
    const toFileExists = fs.existsSync(toFilePath);
    if (!toFileExists) {
      console.warn('不存在与', filename, '同名的数据库，请检查');
      return;
    }
    fs.renameSync(toFilePath, tempFilePath);
    fs.copyFileSync(fromFilePath, toFilePath);
    const oldDB = await Database.open(tempFilePath);
    const newDB = await Database.open(toFilePath);
    const rows = await oldDB.all(`SELECT * FROM search`);
    console.log('正在迁移数据库', filename, '共', rows.length, '条记录');
    const stmt = await newDB.prepare(`INSERT INTO search (message_id, hashed_keyword, unixtime) VALUES (?, ?, ?)`);
    for (const row of rows) {
      await stmt.run(row.message_id, row.hashed_keyword, row.unixtime);
      console.log('已迁移 msgid:', row.message_id);
      process.stdout.moveCursor(0, -1);
    }
    fs.renameSync(tempFilePath, fromFilePath + '.old');
    fs.renameSync(fromFilePath, fromFilePath + '.migrated');
    console.log('已完成迁移', filename);
  }
};

checkAndMigrateDatabases();
