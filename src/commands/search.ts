import jieba from 'nodejieba';
import { putSearchData, generateSearchResultsByKeyword, deleteMessageById, formatChatId, getMessageCount, getMessageCountByKeyword, updateSearchAccess, checkSearchAccess, findAccessibleChatIds, updateGroupInfo, getGroupNameForChatId } from '../database/search';
import { GenericMessage, MessageToEdit, MessageToSend } from 'src/clients/base';
import defaultClientSet from 'src/clients';

export const USAGE = `[chatName] <keyword> 群内隐私搜索`;

// 搜索结果需要同时命中的关键词比例
const HIT_RATIO = 0.75;

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
  while ((await gen.next()).value != null) {
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
      yield generatorCurrentItems.find(k => k?.message_id === mostHitMessageId);
      lastHitMessageId = mostHitMessageId;
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
  return null;
}

const renderSearchResult = async (
  message: GenericMessage,
  chatId: string,
  record: { message_id: any; unixtime: any } | void | null | undefined,
  keywordsStr: string,
  skipCount: number,
) => {
  const reply = async (text: string, extra: Partial<MessageToSend | MessageToEdit> = {}): Promise<any> => {
    await defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text,
      ...extra
    });
  }

  const groupName = await getGroupNameForChatId(chatId) ?? '临时会话';

  if (!record) {
    await reply([
      skipCount ? `在「${groupName}」中没有找到其它有关 ${keywordsStr} 的消息` : `在「${groupName}」中没有找到有关 ${keywordsStr} 的消息`,
    ].filter(k => k).join('\n\n').trim());
    return;
  }

  const totalCount = await Promise.race([
    new Promise(r => setTimeout(r, 3000)).then(() => 0),
    getAccurateResultCount(chatId, keywordsStr),
  ]);
  const url = `https://t.me/c/${formatChatId(chatId)}/${record.message_id}`;
  await reply([
    `在「${groupName}」中查找 ${keywordsStr}\n第 ${skipCount + 1}${totalCount ? '/' + totalCount : ''} 条：🕙 ${new Date(record.unixtime * 1000).toLocaleString('zh-CN')}`,
    url,
    ' ',
    `⬅️ 使用 /search ${chatId} ${keywordsStr} ${skipCount + 1} 继续向前搜索`,
  ].filter(k => k).join('\n').trim());
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const userId = String(message.userId);
  const [groupNameOrChatId, ...keywords] = message.text!.trim().split(/\s+/).slice(1);
  const skipCount = /^\d+$/.test(keywords.slice(-1)[0]) ? parseInt(keywords.pop()!) : 0;
  const simplyReply = (text: string) => {
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      messageIdReplied: message.messageId,
      text,
      rawMessageExtra: {
        parseMode: 'MarkdownV2',
      }
    });
  };
  if (message.clientName !== 'telegram') {
    return simplyReply('由于会话关联的实现问题，目前仅支持在 Telegram 平台发起搜索。');
  }
  if (!groupNameOrChatId || !keywords.length) {
    return simplyReply(`请使用 \`/search <chatId 或模糊群名> <关键词>\` 搜索某个会话，当前的 chatId 为 ${formatChatId(message.chatId)}`);
  }
  const chatIds = await findAccessibleChatIds(groupNameOrChatId, userId);
  if (!chatIds.length) {
    return simplyReply('没有找到该会话或近一天没有在该会话内发言，为保护隐私，请在会话内发言后再执行搜索。');
  }
  if (chatIds.length > 1) {
    return simplyReply('有多个群名符合条件，请给出更精确的群名。');
  }
  const chatId = chatIds[0];
  if (!/^\d+$/.test(chatId)) {
    return simplyReply('由于无法生成消息链接，暂不支持搜索私聊或非超级群。');
  }
  const keywordsStr = keywords.join(' ');
  if (keywordsStr.includes(':')) {
    return simplyReply('暂不支持包含 : 符号的关键词。');
  }
  const generator = searchForKeywordsInChat(chatId, keywordsStr);
  for (let i = 0; i < Number(skipCount); i++) await generator.next();
  const record = (await generator.next()).value;
  await renderSearchResult(message, chatId, record, keywordsStr, skipCount);
};
