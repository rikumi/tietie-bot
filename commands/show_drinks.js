const { showDrinks } = require('../db');

module.exports = async (ctx, bot) => {
  const groupId = ctx.message.chat.id;
  const drinkArray = await showDrinks(groupId);
  console.log(drinkArray);
  return drinkArray && drinkArray.length > 0 ? drinkArray.join('，').toString() : '没有好喝的😭';
};
