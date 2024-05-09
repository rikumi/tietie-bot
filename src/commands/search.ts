import jieba from 'nodejieba';
import { putSearchData, generateSearchResultsByKeyword, deleteMessageById, formatChatId, getMessageCount, getMessageCountByKeyword, updateSearchAccess, checkSearchAccess, findAccessibleChatIds, updateGroupInfo, getGroupNameForChatId } from '../database/search';
import { ExtraEditMessageText, ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `[chatName] <keyword> 群内隐私搜索`;

// 搜索结果需要同时命中的关键词比例
const HIT_RATIO = 0.75;

const forwardedMessageMap = new Map<number, number>();
const resultCountCache = new Map<string, number>();

export const splitToKeywords = (text: string) => {
  const words = jieba.cut(text, true);
  const wordsForSearch = jieba.cutForSearch(text).filter(k => !/^\w$/.test(k));
  return [...new Set([...words, ...wordsForSearch])];
};

export const handleMessage = (message: GenericMessage) => {
  try {
    if (message.clientName !== 'telegram') return;
    if (message.rawMessage?.chat?.type === 'private') return; // 不记录与 bot 的对话
    const searchChatId = formatChatId(message.chatId);
    const { userId, messageId } = message;
    updateSearchAccess(searchChatId, userId);

    if (message.rawMessage?.chat?.title) {
      updateGroupInfo(searchChatId, message.rawMessage.chat.title);
    }
    const words = splitToKeywords(message.text);
    if (!words.length) return;
    putSearchData(searchChatId, messageId, words, Math.floor(message.unixDate));
  } catch (e) {
    console.error(e);
  }
}

export const handleEditedMessage = (message: GenericMessage) => {
  try {
    if (message.clientName !== 'telegram') return;
    if (message.rawMessage?.chat?.type === 'private') return; // 不记录与 bot 的对话
    deleteMessageById(formatChatId(message.chatId), message.messageId);
    const words = splitToKeywords(message.text);
    if (!words.length) return;
    putSearchData(formatChatId(message.chatId), message.messageId, words, Math.floor(message.unixDate));
  } catch (e) {
    console.error(e);
  }
}

const getAccurateResultCount = async (chatId: string, keywordsStr: string) => {
  const cacheKey = chatId + '|' + keywordsStr;
  if (resultCountCache.has(cacheKey)) {
    return resultCountCache.get(cacheKey);
  }
  const gen = searchForKeywordsInChat(chatId, keywordsStr);
  let count = 0;
  while ((await gen.next()).value.result != null) {
    count += 1;
  }
  resultCountCache.set(cacheKey, count);
  return count;
};

async function* searchForKeywordsInChat(chatId: string, keywordsStr: string) {
  const splittedKeywords = new Set(
    splitToKeywords(keywordsStr)
      .map((k) => k.trim())
      .filter((k) => k && !'的一不是了我人在有这'.split('').includes(k))
  );
  const finalKeywords = [...splittedKeywords.values()];
  const generators = finalKeywords.map(kw => generateSearchResultsByKeyword(chatId, kw));
  const generatorCurrentItems = await Promise.all(generators.map(async gen => (await gen.next()).value));
  const keywordFoundTimes: { [key: string]: number } = {};
  const keywordTotalFoundTimes: { [key: string]: number } = {};

  await Promise.all(generatorCurrentItems.map(async (item, index) => {
    keywordFoundTimes[finalKeywords[index]] = (keywordFoundTimes[finalKeywords[index]] || 0) + (item ? 1 : 0);
    keywordTotalFoundTimes[finalKeywords[index]] = await getMessageCountByKeyword(chatId, finalKeywords[index]);
  }));

  const debugInfo = {
    finalKeywords,
    keywordFoundTimes,
    keywordTotalFoundTimes,
  };

  let lastHitMessageId = null;

  while (generatorCurrentItems.some(k => k)) {
    // 检查此时所有关键词中匹配同一条消息的数量是否达到标准
    const candidateMessageIds = generatorCurrentItems.filter(k => k).map(k => k!.message_id);
    const messageCountMap: { [key: string]: number } = {};
    let mostHitMessageId: string | null = null;
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
        if (item?.message_id === mostHitMessageId) debugInfo.keywordFoundTimes[finalKeywords[Number(index)]] += 1;
      }
    }

    // 每次取所有关键词中最晚的一条，向前查一次数据
    const indexedItems = generatorCurrentItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item);

    if (!indexedItems.length) break;
    const latestIndex = indexedItems.reduce((a, b) => a.item!.unixtime > b.item!.unixtime ? a : b)?.index;
    const nextItem = (await generators[latestIndex].next()).value;
    generatorCurrentItems[latestIndex] = nextItem;
  }
  return { result: null, debugInfo };
}

const renderSearchResult = async (
  ctx: any | any,
  chatId: string,
  record: { message_id: any; unixtime: any } | void | null | undefined,
  keywordsStr: string,
  skipCount: number,
  debugInfo?: any
) => {
  if (ctx.callbackQuery) {
    const forwardedMessageId = forwardedMessageMap.get(ctx.chat!.id);
    if (forwardedMessageId) await ctx.telegram.deleteMessage(ctx.chat!.id, forwardedMessageId);
  }
  forwardedMessageMap.delete(ctx.chat!.id);

  const replyOrEditMessage: (text: string, extra?: Partial<ExtraEditMessageText & ExtraReplyMessage>) => Promise<any> = ctx.callbackQuery
    ? ctx.telegram.editMessageText.bind(ctx.telegram, ctx.chat!.id, ctx.callbackQuery.message!.message_id, undefined)
    : ctx.reply.bind(ctx as any);

  const groupName = await getGroupNameForChatId(chatId) ?? '临时会话';

  if (!record) {
    await replyOrEditMessage([
      skipCount ? `在「${groupName}」中没有找到其它有关 ${keywordsStr} 的消息` : `在「${groupName}」中没有找到有关 ${keywordsStr} 的消息`,
      debugInfo ? `🐛 有效关键词：\n${debugInfo.finalKeywords.map((kw: string) => `${kw}：第 ${debugInfo.keywordFoundTimes[kw]}/${debugInfo.keywordTotalFoundTimes[kw]} 次命中`).join('\n')}` : ``,
    ].filter(k => k).join('\n\n').trim(), {
      reply_to_message_id: ctx.message?.message_id,
      disable_notification: true,
      reply_markup: {
        inline_keyboard: [[
          ...(skipCount ? [{ text: '➡️', callback_data: `search:${chatId}:${keywordsStr}:${skipCount - 1}${debugInfo ? ':debug' : ''}` }] : []),
          ...(debugInfo ? [] : [{ text: '🐛', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}:debug` }]),
        ]],
      }
    });
    return;
  }

  const totalCount = await Promise.race([
    new Promise(r => setTimeout(r, 3000)).then(() => 0),
    getAccurateResultCount(chatId, keywordsStr),
  ]);
  const url = `https://t.me/c/${formatChatId(chatId)}/${record.message_id}`;
  const isSearchInGroup = ctx.chat!.type !== 'private';
  await replyOrEditMessage([
    `${isSearchInGroup ? '' : `在「${groupName}」中`}查找 ${keywordsStr}\n第 ${skipCount + 1}${totalCount ? '/' + totalCount : ''} 条：🕙 ${new Date(record.unixtime * 1000).toLocaleString('zh-CN')}`,
    isSearchInGroup && !skipCount ? '⚠️ 群内搜索需点击 🔗 查看消息' : '',
    debugInfo ? `🐛 有效关键词：\n${debugInfo.finalKeywords.map((kw: string) => `${kw}：第 ${debugInfo.keywordFoundTimes[kw]}/${debugInfo.keywordTotalFoundTimes[kw]} 次命中`).join('\n')}` : '',
  ].filter(k => k).join('\n\n').trim(), {
    reply_to_message_id: ctx.message?.message_id,
    disable_notification: true,
    reply_markup: {
      inline_keyboard: [[
        { text: '⬅️', callback_data: `search:${chatId}:${keywordsStr}:${skipCount + 1}${debugInfo ? ':debug' : ''}` },
        ...(skipCount ? [{ text: '➡️', callback_data: `search:${chatId}:${keywordsStr}:${skipCount - 1}${debugInfo ? ':debug' : ''}` }] : []),
        ...(debugInfo ? [
          { text: '🚫', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}` }
        ] : [
          { text: '🐛', callback_data: `search:${chatId}:${keywordsStr}:${skipCount}:debug` }
        ]),
        { text: '🔗', url },
      ]],
    },
  });

  if (isSearchInGroup) {
    return;
  }

  if (record.message_id > 100000000 || record.message_id < 0) {
    const { message_id } = await (ctx as any).reply('[该条消息属于讨论组消息，无法跳转和显示]');
    forwardedMessageMap.set(ctx.chat!.id, message_id);
    return;
  }

  for (const realChatId of [chatId, parseInt('-100' + chatId)]) {
    try {
      const { message_id } = await ctx.telegram.forwardMessage(ctx.chat!.id, realChatId, record.message_id);
      forwardedMessageMap.set(ctx.chat!.id, message_id);
      break;
    } catch (e: any) {
      if (e.description.includes('chat not found')) continue;
      console.error(e);
      if (e.description.includes('message to forward not found')) {
        const { message_id } = await (ctx as any).reply('[消息被删除或对 Bot 不可见，可尝试点击链接查看]');
        forwardedMessageMap.set(ctx.chat!.id, message_id);
        break;
      }
    }
  }
};

export const handleTelegramCallbackQuery = async (ctx: any) => {
  const { data, from } = ctx.callbackQuery;
  const [command, chatId, keywordsStr, skipCount, debug] = data!.split(':');
  const userId = String(from!.id);
  if (command === 'search') {
    const hasAccess = await checkSearchAccess(chatId, userId);
    if (!hasAccess) {
      ctx.telegram.editMessageText(ctx.chat!.id, ctx.callbackQuery.message!.message_id, undefined, '你近一天没有在该群内发言，为保护隐私，请在群内发言后再执行搜索。');
      return;
    }
    const generator = searchForKeywordsInChat(chatId, keywordsStr);
    for (let i = 0; i < Number(skipCount); i++) await generator.next();
    const { result: record, debugInfo } = (await generator.next()).value;
    await renderSearchResult(ctx, chatId, record, keywordsStr, Number(skipCount), debug ? debugInfo : undefined);
  }
}

export const handleSlashCommand = async (_: GenericMessage, ctx: any) => {
  if (!ctx) return;
  const { message, from } = ctx;
  const userId = String(from.id);
  if (['group', 'channel'].includes(message.chat.type)) {
    (ctx as any).reply('暂不支持搜索频道或讨论组的会话。', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
    });
    return;
  }
  if (message && message.chat.type !== 'private') {
    const chatId = formatChatId(message.chat.id);
    const keywords = message.text!.trim().split(/\s+/).slice(1);
    if (!keywords.length) {
      const messageCount = await getMessageCount(chatId);
      (ctx as any).reply([
        `请使用 \`/search <关键词>\` 搜索当前会话。`,
        `🔐 Bot 仅存储群名称、匿名的消息 id、会话 id、关键词加盐 hash 和时间戳信息，不保留消息内容、群组和发送者资料，搜索结果的调取和显示由 Telegram 提供。`,
        `📝 当前会话已索引 ${messageCount} 条消息记录${messageCount > 10000 ? '' : '，如需导入全部消息记录请联系管理员'}。`,
      ].join('\n\n'), {
        reply_to_message_id: ctx.message.message_id,
        disable_notification: true,
        parse_mode: 'MarkdownV2',
      });
      return;
    }
    const keywordsStr = keywords.join(' ');
    if (keywordsStr.includes(':')) {
      (ctx as any).reply('暂不支持包含 : 符号的关键词。', {
        reply_to_message_id: ctx.message.message_id,
        disable_notification: true,
      });
      return;
    }
    const { result: record } = (await searchForKeywordsInChat(chatId, keywordsStr).next()).value;
    await renderSearchResult(ctx, chatId, record, keywordsStr, 0);
    return;
  }
  const [groupNameOrChatId, ...keywords] = message.text!.trim().split(/\s+/).slice(1);
  if (!groupNameOrChatId || !keywords.length) {
    (ctx as any).reply(`请使用 \`/search <chatId 或模糊群名> <关键词>\` 搜索某个会话，其中 chatId 可在对应会话中输入 \`/search\` 获取`, {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
      parse_mode: 'MarkdownV2',
    });
    return;
  }
  if (formatChatId(groupNameOrChatId) === formatChatId(ctx.message.chat.id)) {
    (ctx as any).reply('暂不支持搜索与机器人之间的会话。', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
    });
    return;
  }
  const chatIds = await findAccessibleChatIds(groupNameOrChatId, userId);
  if (!chatIds.length) {
    (ctx as any).reply('没有找到你近一天发言过的与之相关的群，请确认群名或会话 id，或在群内发言后再执行搜索。', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
    });
    return;
  }
  if (chatIds.length > 1) {
    const groupNames = await Promise.all(chatIds.map(getGroupNameForChatId));
    (ctx as any).reply('要搜索哪个群？', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
      reply_markup: {
        inline_keyboard: chatIds.map((chatId, i) => [
          { text: groupNames[i], callback_data: `search:${chatId}:${keywords.join(' ')}:0` },
        ]),
      },
    });
    return;
  }
  const chatId = chatIds[0];
  const keywordsStr = keywords.join(' ');
  if (keywordsStr.includes(':')) {
    (ctx as any).reply('暂不支持包含 : 符号的关键词。', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
    });
    return;
  }
  const { result: record } = (await searchForKeywordsInChat(chatId, keywordsStr).next()).value;
  await renderSearchResult(ctx, chatId, record, keywordsStr, 0);
};
