const fs = require('fs');
const path = require('path');
const util = require('util');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const { splitToKeywords } = require('../commands/search');
const { putSearchData, deleteMessageById, formatChatId } = require('./search');

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
    process.stdout.moveCursor(0, -1);
  }
};

const importSearchDataFromFolder = async (chatId, dir) => {
  if (!fs.statSync(dir).isDirectory()) return;

  chatId = formatChatId(chatId);
  const files = fs.readdirSync(dir)
    .sort((a, b) => Number(/\d+/.exec(a)?.[0] ?? '1') - Number(/\d+/.exec(b)?.[0] ?? '1'));

  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    try {
      await importSearchDataFromFile(path.resolve(dir, file), chatId);
      console.log('已完成导入文件：', file);
    } catch (e) {
      console.error('search_import 解析文件失败：', file, e);
    }
  }
  console.log('已完成导入所有数据：', path.resolve(__dirname, `../search-v2-${chatId}.db`));
};

const [chatId, dir] = process.argv.slice(2);
if (!chatId || !/^(-100)?\d+$/.test(chatId) || !dir) {
  console.log(`用法：node search_import.js <chatId> <tdesktop 导出的聊天记录路径>`);
  process.exit(0);
}

importSearchDataFromFolder(chatId, dir);
