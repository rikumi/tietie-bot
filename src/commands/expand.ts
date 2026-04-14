import { GenericMessage } from '../clients/base';

export const USAGE = `<字符串...> 展开参数中的花括号组合，每种组合输出一行`;

/**
 * 展开字符串中的花括号组合，支持嵌套，行为与 bash 花括号展开一致。
 * 例：a{b,c{d,e}}f → abf、acdf、acef
 */
function expand(str: string): string[] {
  const start = str.indexOf('{');
  if (start === -1) return [str];

  // 找到与 start 匹配的右花括号（处理嵌套）
  let depth = 0;
  let end = -1;
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  // 没有匹配的右花括号，当作普通字符串
  if (end === -1) return [str];

  const prefix = str.slice(0, start);
  const inner = str.slice(start + 1, end);
  const suffix = str.slice(end + 1);

  // 按顶层逗号拆分各备选项
  const alternatives: string[] = [];
  let current = '';
  let d = 0;
  for (const ch of inner) {
    if (ch === '{') { d++; current += ch; }
    else if (ch === '}') { d--; current += ch; }
    else if (ch === ',' && d === 0) { alternatives.push(current); current = ''; }
    else { current += ch; }
  }
  alternatives.push(current);

  // 空花括号或只有一个选项时跳过展开，保留字面量并继续处理 suffix
  if (alternatives.length <= 1) {
    return expand(suffix).map((s) => prefix + '{' + inner + '}' + s);
  }

  const results: string[] = [];
  for (const alt of alternatives) {
    for (const s of expand(alt + suffix)) {
      results.push(prefix + s);
    }
  }
  return results;
}

export const handleSlashCommand = async (message: GenericMessage) => {
  const input = message.text.trim().split(/\s+/).slice(1).join(' ');
  if (!input) {
    return `用法：/expand ${USAGE}`;
  }

  const results = expand(input);
  return results.join('\n');
};
