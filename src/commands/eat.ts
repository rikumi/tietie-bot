import { GenericMessage } from 'src/clients/base';
import { getMyFoods, pickFood, setMyFoods } from 'src/database/foods';
import { fetch } from 'undici';

const MAX_FOODS_PER_USER = 10;

export const USAGE = `[foods] | list | clear 随机选择一种食物或设置/查询自己推荐的食物，每位用户不可超过 ${MAX_FOODS_PER_USER} 个选项`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = message.text.trim().split(/\s+/).slice(1);

  // pick
  if (!content.length) {
    const result = await pickFood(message.chatId);
    if (!result) {
      return `本会话还未添加任何食物，每人可使用 /eat [foods] 推荐最多 ${MAX_FOODS_PER_USER} 个。`;
    }
    const { name, count } = result;
    return `猜你想吃：${name} (由 ${count} 人贡献)`;
  }

  // list
  if (content[0] === 'list') {
    const list = (await getMyFoods(message.chatId, message.userId)).map(({ name, count }) => {
      if (count <= 1) return name;
      return `${name}(*${count})`;
    }).join(', ');

    if (!list) {
      return `你还未在本会话内推荐你喜爱的食物，使用 /eat [foods] 设置最多 ${MAX_FOODS_PER_USER} 个。`;
    }
    return `你推荐了以下食物（排名不分先后，多次重复可提高出现概率）：\n${list}`;
  }

  // clear
  if (content[0] === 'clear') {
    await setMyFoods([], message.chatId, message.userId);
    return '已成功清除你推荐的食物。';
  }

  // set
  if (content.length > MAX_FOODS_PER_USER) {
    return `每位用户在本会话内不可推荐超过 ${MAX_FOODS_PER_USER} 种食物。`;
  }

  const searchFailures = (await Promise.all(content.map(async (name) => {
    const result = await fetch(`https://zh.wikipedia.org/wiki/${encodeURIComponent(name)}`);
    if (result.status >= 400) return name;
  }))).filter(Boolean);

  if (searchFailures.length) {
    return `以下词条未在维基百科收录，如果你想吃它，不妨去创建个词条：\n${searchFailures.join(', ')}`;
  }
  await setMyFoods(content, message.chatId, message.userId);
  const list = (await getMyFoods(message.chatId, message.userId)).map(({ name, count }) => {
    if (count <= 1) return name;
    return `${name}(*${count})`;
  }).join(', ');
  return `已成功设置你推荐的食物：（排名不分先后，多次重复可提高出现概率）：\n${list}`;
};
