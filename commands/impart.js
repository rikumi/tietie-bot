const impartGroups = new Set();

module.exports = (ctx, bot) => {
  const { message } = ctx;
  const text = message.text.trim().replace(/^.*?\s+/, '');
  const chatId = message.chat.id;
  if (text === 'on') {
    if (exports.isInImpart(chatId)) return '本群已经在 impart 了，请用 `/指令` 操作群友吧';
    exports.setImpart(chatId, true);
    return '已开启 impart 模式，试试用 `/指令` 操作群友吧';
  }
  if (text === 'off') {
    if (!exports.isInImpart(chatId)) return '本群还没有在 impart，无需关闭';
    exports.setImpart(chatId, false);
    return '已结束 impart';
  }
  return '用法：`/impart on|off` 切换 impart 模式';
};

exports = module.exports;

exports.isInImpart = (groupId) => {
  return impartGroups.has(groupId);
};

exports.setImpart = (groupId, value) => {
  if (value) {
    impartGroups.add(groupId);
  } else {
    impartGroups.delete(groupId);
  }
}
