const { pickDrink } = require('../modules/database');

module.exports = async (ctx) => {
  const groupId = ctx.message.chat.id;
  const drink = await pickDrink(groupId);
  return drink ? drink + '！' : '没有好喝的😭';
};
