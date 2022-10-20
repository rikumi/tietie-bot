const { addDrink, checkDrinks } = require('../db');

module.exports = async (ctx, bot) => {
  const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');
  const content = Array.from(
    new Set(
      ctx.message.text
        .split(/\s+/)
        .slice(1)
        .map((e) => escape(e))
    )
  );
  const groupId = ctx.message.chat.id;
  if (content.length === 0) return '不可以什么都不加👊';
  if (content.length > 10) return '什么几把玩意儿，一次加这么多？';
  if (content.some((e) => e.length > 10)) return '什么几把玩意儿，一次加这么长？';
  return checkDrinks(content, groupId).then(async (value) => {
    console.log(value);
    if (value.some((e) => e !== undefined)) return '这个已经有了👊';
    const result = await addDrink(content, groupId);
    return result ? `添加了 ${content.join('，')}！` : `添加失败了😭`;
  }, console.log);
};
