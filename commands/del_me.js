const pinyin = require('pinyin');
const { deleteCharacter } = require('../modules/database');

module.exports = async (ctx) => {
  const { message } = ctx;
  const content = message.text.trim().replace(/^.*?(\s+|$)/, '');
  if (!content) {
    return '用法：/del_me <关键词|all> 删除自己相关的语录';
  }
  const keyword = content.replace(/^all$/, '')
  const { id, username, first_name, last_name } = message.from;
  await deleteCharacter('user_' + id, keyword);
  await deleteCharacter(username, keyword);
  await deleteCharacter(pinyin.pinyin(`${first_name} ${last_name}`.toLowerCase(), {
    style: 'NORMAL',
    compact: true,
    segment: 'segmentit',
    group: true,
  })[0].join('').replace(/[^\w]/g, '_'), keyword);

  return '已删除相关的人设语料';
};
