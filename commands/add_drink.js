const { addDrink } = require('../db');

module.exports = (ctx, bot) => {
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  const content = ctx.message.text
    .split(/\s+/)
    .slice(1)
    .map((e) => escape(e));
  if (content.length === 0) return;
  addDrink(content);
  return `添加了 ${content.join('，')}！`;
};
