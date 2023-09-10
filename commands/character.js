const pinyin = require('pinyin');
const { appendCharacter, clearCharacter, isCharacterOptOut, setCharacterOptOut } = require('../modules/database');

const intro = `【模拟人格功能介绍】

1. 私聊转发别人的消息，可为每条消息的原始发送者建立模拟人格，转发的消息越多，人格越完善；
2. 在任意有贴贴 Bot 的聊天使用 /用户名 <提问> 可向该人格提问（用户名以 Bot 回复为准）；
3. 使用 /character off 可屏蔽该功能，屏蔽后别人不可为当前用户建立人设，为了保证公平性，当前用户也不可为别人建立人设；使用 /character on 重新启用；

【模拟人格使用规范】
1. 请尊重别人的选择，征得对方同意再使用；
2. 请勿选择过分偏颇的言论，歪曲他人形象；
3. 禁止对不再上线的用户（如退圈、身故等）使用；

【模拟人格指令生成规则】
1. 若用户开启了【转发显示用户名】功能，且设置了用户名，将使用用户名作为该用户的人格指令；
2. 若用户开启了【转发显示用户名】功能，但没有设置用户名，将使用 user_ + uid 作为该用户的人格指令；
3. 若用户关闭了【转发显示用户名】功能，将使用 "first_name last_name" 的拼音转写作为该用户的人格指令；
4. 若生成人格指令所用的名称发生修改，原有的人格将会丢失，如需继续使用可重新建立人格；
5. 若名称中含有连续非中英和数字的字符，生成的指令可能会无法使用。
`;

const toPinyin = (name) => {
  return pinyin.pinyin(name.toLowerCase(), {
    style: 'NORMAL',
    compact: true,
    segment: 'segmentit',
    group: true,
  })[0].join('').replace(/[^\w]/g, '_').replace(/^_|_$/g, '').replace(/_{2,}/g, '_');
};

const generateUsernames = (user) => {
  const usernames = [];
  if (user.username) {
    usernames.push(user.username);
  }
  if (user.id) {
    usernames.push('user_' + user.id);
  }
  if (user.first_name && user.last_name) {
    usernames.push(toPinyin(user.first_name + ' ' + user.last_name));
    usernames.push(toPinyin(user.last_name + ' ' + user.first_name));
  } else {
    usernames.push(toPinyin(user.first_name || user.last_name));
  }
  return usernames;
};

const handlePrivateForward = async (ctx) => {
  const { message } = ctx;
  if (message.forward_from && message.from && message.forward_from.id === message.from.id) {
    ctx.reply('为防止同一人出现两个人设指令，暂不支持为自己设定人设');
    return;
  }
  const username = message.forward_from ? generateUserNames(message.forward_from)[0] : toPinyin(message.forward_sender_name);
  if (await isCharacterOptOut(username)) {
    ctx.reply(`用户 ${username} 的设置不允许为其建立人设。`);
    return;
  }
  if (await isCharacterOptOut('user_' + message.from.id)) {
    ctx.reply('你的设置不允许为他人建立人设。');
    return;
  }
  await appendCharacter(username, message.text, message.from.id);
  if (batchForwardReplyTimeoutMap[message.from.id]) {
    clearTimeout(batchForwardReplyTimeoutMap[message.from.id]);
    delete batchForwardReplyTimeoutMap[message.from.id];
  }
  batchForwardReplyTimeoutMap[message.from.id] = setTimeout(() => {
    ctx.reply(`已将以上转发内容添加到各自发送者的人设集，可输入 /${username.toLowerCase()} 进行尝试；转发单条消息可查询用户对应的指令名`);
  }, 1000);
};

module.exports = async (ctx) => {
  const { message } = ctx;
  const command = message.text.split(/\s+/)[1];
  if (!['on', 'off', 'clear'].includes(command)) {
    return intro;
  }
  const usernames = generateUsernames(ctx.from);
  const successUsernames = [];
  if (command === 'off') {
    for (const username of usernames) {
      const result = await setCharacterOptOut(username, true);
      if (result) successUsernames.push(username);
    }
    if (!successUsernames.length) {
      return '当前使用的所有用户名均已屏蔽模拟人格功能。';
    }
    return '已屏蔽以下可能指令的模拟人格功能，屏蔽后别人不可为当前用户建立人设，为了保证公平性，当前用户也不可为别人建立人设：' + successUsernames.join(';');
  }
  if (command === 'on') {
    for (const username of usernames) {
      const result = await setCharacterOptOut(username, false);
      if (result) successUsernames.push(username);
    }
    if (!successUsernames.length) {
      return '当前使用的所有用户名均已开启模拟人格功能。';
    }
    return '已开启以下可能指令的模拟人格功能：' + successUsernames.join(';');
  }
  if (command === 'clear') {
    for (const username of usernames) {
      await clearCharacter(username);
    }
    return '已清空以下可能指令的模拟人格语料：' + usernames.join(';') + '。如需屏蔽模拟人格功能，请使用 /character off';
  }
};

module.exports.intro = intro;
module.exports.generateUsernames = generateUsernames;
module.exports.handlePrivateForward = handlePrivateForward;
