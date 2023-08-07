const SYMBOLS = [, '⬛', '🟫', '🟦', '🟪', '🟨'];

module.exports = (ctx) => {
  const message = ctx.callbackQuery ? ctx.callbackQuery.message : ctx.message;
  const counts = ctx.callbackQuery
    ? ctx.callbackQuery.data.split(':')[1].split(',').map(Number)
    : [0, 0, 0, 0, 0];

  const numberResults = Array(10).fill().map(() => {
    const rand = Math.random();
    if (rand < 0.01) return 5;
    if (rand < 0.1) return 4;
    if (rand < 0.3) return 3;
    if (rand < 0.5) return 2;
    return 1;
  }).sort((a, b) => b - a);

  const symbolResult = numberResults.map(k => SYMBOLS[k]).join('');
  const newCounts = counts.map((k, i) => k + numberResults.filter(k => k === i + 1).length);
  const totalCount = newCounts.reduce((a, b) => a + b, 0);
  const totalGolds = newCounts[4];
  const tierIndex = Math.min(5, Math.max(0, Math.round(totalGolds / totalCount / 0.01 + 1))) || 1;

  const stats = [
    `总计抽数：${totalCount}`,
    `总计出金：${totalGolds}`,
    `运气指数：${Array(tierIndex).fill().map(() => '⭐️').join('')}`,
  ].join('\n');

  const text = `${symbolResult}\n\n${stats}`;
  const replyMarkup = {
    inline_keyboard: [[{
      text: '再抽一次',
      callback_data: `chou:${newCounts.join(',')}`,
    }]],
  };

  if (ctx.callbackQuery) {
    ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, text, { reply_markup: replyMarkup });
  } else {
    ctx.telegram.sendMessage(message.chat.id, text, { reply_markup: replyMarkup });
  }
};
