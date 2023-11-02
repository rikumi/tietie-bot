const jieba = require('nodejieba');
const { putSearchData, generateSearchResultsByKeyword, deleteMessageById, formatChatId, getMessageCount, getMessageCountByKeyword } = require('../database/search');

// 搜索结果需要同时命中的关键词比例
const HIT_RATIO = 0.75;

const forwardedMessageMap = {};

const splitToKeywords = (text) => {
  const words = jieba.cut(text, true);
  const wordsForSearch = jieba.cutForSearch(text).filter(k => !/^\w$/.test(k));
  return [...new Set([...words, ...wordsForSearch])];
};

const recordChatMessage = (ctx) => {
  try {
    if (ctx.chat.type === 'private') return; // 不记录与 bot 的对话
    const { message_id: messageId, text, date, caption } = ctx.message;
    if (!text) return;
    const words = splitToKeywords(text || caption || '');
    if (!words.length) return;
    putSearchData(formatChatId(ctx.chat.id), messageId, words, Math.floor(date));
  } catch (e) {
    console.error(e);
  }
}

const recordEditedMessage = (ctx) => {
  try {
    if (ctx.chat.type === 'private') return; // 不记录与 bot 的对话
    const { message_id: messageId, text, date, caption } = ctx.editedMessage;
    deleteMessageById(formatChatId(ctx.chat.id), messageId);
    if (!text) return;
    const words = splitToKeywords(text || caption || '');
    if (!words.length) return;
    putSearchData(formatChatId(ctx.chat.id), messageId, words, Math.floor(date));
  } catch (e) {
    console.error(e);
  }
}

const predicateSearchResultCount = async (chatId, keywordTotalFoundTimes) => {
  const selectAndMultiplyPossibilities = (possibilityArray, count) => {
    if (count === 0) return 1;
    return Array(possibilityArray.length - count + 1).fill(0).map((_, i) => {
      return selectAndMultiplyPossibilities(possibilityArray.slice(i + 1), count - 1) * possibilityArray[i];
    }).reduce((a, b) => a + b, 0);
  };
  const totalCount = await getMessageCount(chatId);
  const keywordCounts = Object.values(keywordTotalFoundTimes);
  const p = selectAndMultiplyPossibilities(keywordCounts.map(count => count / totalCount), Math.ceil(keywordCounts.length * HIT_RATIO));
  console.log('预测结果数量', p, keywordCounts, totalCount);
  const result = Math.round(p * totalCount);
  return result < 10 ? '<10' : String(result);
}

async function* searchForKeywordsInChat(chatId, keywordsStr) {
  const splittedKeywords = new Set(
    splitToKeywords(keywordsStr)
      .map((k) => k.trim())
      .filter((k) => k && !'的一不是了我人在有这'.split('').includes(k))
  );
  const finalKeywords = [...splittedKeywords.values()];
  const generators = finalKeywords.map(kw => generateSearchResultsByKeyword(chatId, kw));
  const generatorCurrentItems = await Promise.all(generators.map(async gen => (await gen.next()).value));
  const keywordFoundTimes = {};
  const keywordTotalFoundTimes = {};

  await Promise.all(generatorCurrentItems.map(async (item, index) => {
    keywordFoundTimes[finalKeywords[index]] = (keywordFoundTimes[finalKeywords[index]] || 0) + (item ? 1 : 0);
    keywordTotalFoundTimes[finalKeywords[index]] = await getMessageCountByKeyword(chatId, finalKeywords[index]);
  }));

  const predicatedTotal = await predicateSearchResultCount(chatId, keywordTotalFoundTimes)

  const debugInfo = {
    finalKeywords,
    keywordFoundTimes,
    keywordTotalFoundTimes,
    predicatedTotal,
  };

  let lastHitMessageId = null;

  while (generatorCurrentItems.some(k => k)) {
    // 检查此时所有关键词中匹配同一条消息的数量是否达到标准
    const candidateMessageIds = generatorCurrentItems.filter(k => k).map(k => k.message_id);
    const messageCountMap = {};
    let mostHitMessageId = null;
    for (const messageId of candidateMessageIds) {
      messageCountMap[messageId] = (messageCountMap[messageId] || 0) + 1;
      if (!mostHitMessageId || messageCountMap[messageId] > messageCountMap[mostHitMessageId]) {
        mostHitMessageId = messageId;
      }
    }
    if (mostHitMessageId && mostHitMessageId !== lastHitMessageId && messageCountMap[mostHitMessageId] >= generators.length * HIT_RATIO) {
      // 超过一定比例的关键词命中了同一条消息，且不是上次查找到的消息
      const message = generatorCurrentItems.find(k => k?.message_id === mostHitMessageId);
      yield { result: message, debugInfo };
      lastHitMessageId = mostHitMessageId;
      for (const [index, item] of Object.entries(generatorCurrentItems)) {
        if (item?.message_id === mostHitMessageId) debugInfo.keywordFoundTimes[finalKeywords[index]] += 1;
      }
    }

    // 每次取所有关键词中最晚的一条，向前查一次数据
    const indexedItems = generatorCurrentItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item);

    if (!indexedItems.length) break;
    const latestIndex = indexedItems.reduce((a, b) => a.item.unixtime > b.item.unixtime ? a : b)?.index;
    const nextItem = (await generators[latestIndex].next()).value;
    generatorCurrentItems[latestIndex] = nextItem;
  }
  return { result: null, debugInfo };
}

const renderSearchResult = async (ctx, chatId, record, keywordsStr, skipCount, debugInfo) => {
  if (ctx.callbackQuery) {
    const forwardedMessageId = forwardedMessageMap[ctx.chat.id];
    if (forwardedMessageId) await ctx.telegram.deleteMessage(ctx.chat.id, forwardedMessageId);
  }
  delete forwardedMessageMap[ctx.chat.id];

  const replyOrEditMessage = ctx.callbackQuery
    ? ctx.telegram.editMessageText.bind(ctx.telegram, ctx.chat.id, ctx.callbackQuery.message.message_id, undefined)
    : ctx.reply.bind(ctx);

  if (!record) {
    await replyOrEditMessage([
      skipCount ? `没有找到其它有关 ${keywordsStr} 的消息` : `没有找到有关 ${keywordsStr} 的消息`,
      debugInfo ? `🐛 有效关键词：\n${debugInfo.finalKeywords.map((kw) => `${kw}：第 ${debugInfo.keywordFoundTimes[kw]}/${debugInfo.keywordTotalFoundTimes[kw]} 次命中`).join('\n')}` : ``,
    ].filter(k => k).join('\n\n').trim(), {
      reply_to_message_id: ctx.message?.message_id,
      reply_markup: {
        inline_keyboard: [[
          ...(skipCount ? [{ text: '➡️ 后一条', callback_data: `search:${chatId}:${keywordsStr}:${skipCount - 1}${debugInfo ? ':debug' : ''}` }] : []),
          ...(debugInfo ? [] : [{ text: '🐛 debug', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}:debug` }]),
        ]],
      }
    });
    return;
  }

  const url = `https://t.me/c/${formatChatId(chatId)}/${record.message_id}`;
  await replyOrEditMessage([
    `${keywordsStr} 的第 ${skipCount + 1} 条搜索结果：\n🕙 ${new Date(record.unixtime * 1000).toLocaleString('zh-CN')}`,
    debugInfo ? `🤔 总共约 ${debugInfo.predicatedTotal} 条结果` : ``,
    debugInfo ? `🐛 有效关键词：\n${debugInfo.finalKeywords.map((kw) => `${kw}：第 ${debugInfo.keywordFoundTimes[kw]}/${debugInfo.keywordTotalFoundTimes[kw]} 次命中`).join('\n')}` : ``,
  ].filter(k => k).join('\n\n').trim(), {
    reply_to_message_id: ctx.message?.message_id,
    reply_markup: {
      inline_keyboard: [[
        { text: '⬅️ 前一条', callback_data: `search:${chatId}:${keywordsStr}:${skipCount + 1}${debugInfo ? ':debug' : ''}` },
        ...(skipCount ? [{ text: '➡️ 后一条', callback_data: `search:${chatId}:${keywordsStr}:${skipCount - 1}${debugInfo ? ':debug' : ''}` }] : []),
        ...(debugInfo ? [
          { text: '🚫 debug', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}` }
        ] : [
          { text: '🐛 debug', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}:debug` }
        ]),
        { text: '🔗 查看', url },
      ]],
    },
  });

  if (record.message_id > 100000000 || record.message_id < 0) {
    const { message_id } = await ctx.reply('[该条消息属于讨论组消息，无法跳转和显示]');
    forwardedMessageMap[ctx.chat.id] = message_id;
    return;
  }

  for (const realChatId of [chatId, parseInt('-100' + chatId)]) {
    try {
      const { message_id } = await ctx.telegram.forwardMessage(ctx.chat.id, realChatId, record.message_id);
      forwardedMessageMap[ctx.chat.id] = message_id;
      break;
    } catch (e) {
      if (e.description.includes('chat not found')) continue;
      console.error(e);
      if (e.description.includes('message to forward not found')) {
        const { message_id } = await ctx.reply('[消息被删除或不在 Bot 可见时间范围内，可尝试点击链接查看]');
        forwardedMessageMap[ctx.chat.id] = message_id;
        break;
      }
    }
  }
};

module.exports = async (ctx) => {
  if (ctx.callbackQuery) {
    const { data } = ctx.callbackQuery;
    const [command, chatId, keywordsStr, skipCount, debug] = data.split(':');
    if (command === 'search') {
      const generator = searchForKeywordsInChat(chatId, keywordsStr);
      for (let i = 0; i < Number(skipCount); i++) await generator.next();
      const { result: record, debugInfo } = (await generator.next()).value;
      await renderSearchResult(ctx, chatId, record, keywordsStr, Number(skipCount), debug ? debugInfo : undefined);
    }
    return;
  }
  if (ctx.message.chat.type !== 'private') {
    const chatId = formatChatId(ctx.message.chat.id);
    const messageCount = await getMessageCount(chatId);
    ctx.reply([
      `请在私聊中使用 \`/search ${chatId}\` 加关键词搜索当前会话。`,
      `🔐 Bot 仅存储匿名的消息 id、会话 id、关键词 hash 和时间戳信息，不保留消息内容、群组和发送者信息，搜索结果的调取和显示由 Telegram 提供。`,
      `📝 当前会话已索引 ${messageCount} 条消息记录${messageCount > 100000 ? '' : '，如需导入全部消息记录请联系管理员'}。`,
    ].join('\n\n'), {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    });
    return;
  }
  const { message } = ctx;
  const [chatId, ...keywords] = message.text.trim().split(/\s+/).slice(1);
  if (!chatId || !/^-?\d+$/.test(chatId) || !keywords.length) {
    ctx.reply(`请使用 \`/search <chatId>\` 加关键词搜索某个会话，其中 chatId 可在对应会话中输入 \`/search\` 获取`, {
      reply_to_message_id: ctx.message.message_id,
      parse_mode: 'MarkdownV2',
    });
    return;
  }
  if (formatChatId(chatId) === formatChatId(ctx.message.chat.id)) {
    ctx.reply('暂不支持搜索与机器人之间的会话。', {
      reply_to_message_id: ctx.message.message_id,
    });
    return;
  }
  const keywordsStr = keywords.join(' ');
  const { result: record } = (await searchForKeywordsInChat(chatId, keywordsStr).next()).value;
  await renderSearchResult(ctx, chatId, record, keywordsStr, 0);
}

module.exports.splitToKeywords = splitToKeywords;
module.exports.recordChatMessage = recordChatMessage;
module.exports.recordEditedMessage = recordEditedMessage;
