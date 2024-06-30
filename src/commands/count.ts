import { GenericMessage } from 'src/clients/base';

export const USAGE = `<number|expression> [StackCount] 计算在 MC 中的易读数字表达`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = message.text!.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const strArr = content.split(/[ |，,]/);
  // 提取为数字，不是数字就拉倒吧！
  const expression = Number(strArr[0])
  if(isNaN(expression)){
    return `${message.userName} ${strArr[0]} 是数字喵？！`;
  }
  // 堆叠数量
  const stackCount = +strArr[1] ? +strArr[1] : 64;
  // 数量级定义
  const countLevel = [
    {
      name: "大箱盒",
      count: 54 * 27 * stackCount,
    },
    {
      name: "桶装盒",
      count: 27 * 27 * stackCount,
    },
    {
      name: "盒",
      count: 27 * stackCount,
    },
    {
      name: "组",
      count: stackCount,
    },
    {
      name: "个",
      count: 1,
    },
  ];
  // 一个物品就没组的概念了
  if (stackCount === 1) {
    countLevel.splice(2, 1);
  }
  /** 计算易读的数字表达
   *
   * @param {number} count - 输入的数量
   * @param {number} [level=0] - 当前计算的数量级
   * @param {string} [result=""] - 结果字符串
   * @return {string}
   */
  const countItem = (count:number, level = 0, result = ""):string => {
    // 如果计算完了所有的数量级则返回
    if (level === countLevel.length) {
      return result;
    }
    // 获取当前等级对象
    const lv = countLevel[level++];
    if (count >= lv.count) {
      const num = Math.floor(count / lv.count);
      result += (result.length ? " 零 " + num : num) + ' ' +lv.name;
      count = count % lv.count;
    }
    return countItem(count, level, result);
  };
  return `${strArr[0]} = ${countItem(expression)}`;
};
