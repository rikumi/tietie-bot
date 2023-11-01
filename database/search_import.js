const fs = require('fs');
const path = require('path');
const util = require('util');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const { splitToKeywords } = require('../commands/search');
const { putSearchData, deleteMessageById } = require('./search');

const dirs = fs.readdirSync(path.resolve(__dirname, './search_imports'));

const importSearchDataFromFile = async (filePath, chatId) => {
  console.log('解析文件：', filePath);
  const content = await util.promisify(fs.readFile)(filePath, 'utf8');
  const $ = cheerio.load(content);
  const messages = $('.message.default').toArray();
  for (const messageEl of messages) {
    const messageId = parseInt($(messageEl).attr('id').replace('message', ''));
    const text = $(messageEl).find('.text').text();
    const timeStr = $(messageEl).find('.date').attr('title');
    const [day, month, year, hour, minute, second, tzh, tzm] = [...timeStr?.matchAll(/\d+/g)].map((s) => s[0]);
    const time = dayjs(`${year}-${month}-${day} ${hour}:${minute}:${second}+${tzh}:${tzm}`, 'YYYY-MM-DD HH:mm:ssZ').unix();
    if (!time) {
      console.error('日期格式错误：', timeStr);
      process.exit(1);
    }
    const words = splitToKeywords(text);
    await deleteMessageById(chatId, messageId);
    await putSearchData(chatId, messageId, words, time);
    console.log('已导入消息', messageId);
  }
};

const importAllSearchData = async () => {
  for (const dir of dirs) {
    if (!/^-?\d+$/.test(dir)) {
      console.warn('跳过不符合格式的目录名：', dir);
      continue;
    }
    if (!fs.statSync(path.resolve(__dirname, `./search_imports/${dir}`)).isDirectory()) continue;
    const files = fs.readdirSync(path.resolve(__dirname, `./search_imports/${dir}`))
      .sort((a, b) => Number(/\d+/.exec(a)?.[0] ?? '1') - Number(/\d+/.exec(b)?.[0] ?? '1'));

    for (const file of files) {
      if (!file.endsWith('.html')) continue;
      try {
        await importSearchDataFromFile(path.resolve(__dirname, `./search_imports/${dir}/${file}`), dir);
        fs.rmSync(path.resolve(__dirname, `./search_imports/${dir}/${file}`));
        console.log('已完成导入并删除文件：', `${dir}/${file}`);
      } catch (e) {
        console.error('search_import 解析文件失败：', `${dir}/${file}`, e);
      }
    }
    fs.rmdirSync(path.resolve(__dirname, `./search_imports/${dir}`), { recursive: true });
    console.log('已完成导入并删除目录：', dir);
  }
};

module.exports = {
  importAllSearchData,
};
