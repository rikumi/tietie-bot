const pinyin = require('pinyin');
const { clearCharacter } = require('../modules/database');

module.exports = async (ctx) => {
  const { message } = ctx;
  const content = message.text.trim().replace(/^.*?(\s+|$)/, '');
  if (!content) {
    return '用法：/del_me <关键词|all> 删除自己相关的语录';
  }
  const keyword = content.replace(/^all$/, '')
  const { id, username, first_name, last_name } = message.from;
  await clearCharacter('user_' + id, keyword);
  if (username) {
    await clearCharacter(username, keyword);
  }
  await clearCharacter(pinyin.pinyin(`${first_name} ${last_name}`.toLowerCase(), {
    style: 'NORMAL',
    compact: true,
    segment: 'segmentit',
    group: true,
  })[0].join('').replace(/[^\w]/g, '_'), keyword);

  return '已删除相关的人设语料';
};
