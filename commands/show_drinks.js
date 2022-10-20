const { showDrinks } = require('../db');

module.exports = async (ctx, bot) => {
  const drinkArray = await showDrinks();
  console.log(drinkArray);
  return drinkArray && drinkArray.length > 0 ? drinkArray.join('，').toString() : '没有好喝的😭';
};
