import { GenericMessage } from 'src/clients/base';
import { evaluate } from 'mathjs';

export const USAGE = `[#stackCount] <number|expression> 计算在 MC 中的易读数字表达`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const content = message.text!.trim()
    .replace(/^.*?\s+/, '')
    .replace(/[^\d+\-*#\s/()]/g, '')
    .replace(/#(\d+)/, '');
  const stackCount = parseInt(RegExp.$1) || 64;
  if (!content) return;
  let remaining = Math.max(0, Math.round(evaluate(content)));
  return [stackCount, 27, 27, 2, Infinity]
    .map((k, i) => ([remaining, i] = [Math.floor(remaining / k), remaining % k])[1])
    .map((value, level) => value ? value + '个组盒桶箱'[level] : '')
    .reverse().filter(Boolean).join(' 零') || '什么也没有！';
};
