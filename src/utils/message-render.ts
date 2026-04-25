import { GenericMessageEntity } from './base';

const escapeHTML = (str: string) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const renderEntitiesToHTML = (entities: GenericMessageEntity[], text: string): string => {
  entities = entities.slice();
  const newline = /\n/g;
  while (newline.exec(text)) {
    entities.push({ type: 'newline' as any, offset: newline.lastIndex, length: 0 });
  }
  const tagsReversed = entities.map((e) => ((e.type as any) === 'newline' ? [e.offset] : [e.offset, e.offset + e.length]).map((position) => {
    const tagName = ({ bold: 'strong', italic: 'em', strikethrough: 'del', underline: 'u', mention: 'a', link: 'a', newline: 'br', image: 'img' } as any)[e.type] || e.type;
    const tag = position === e.offset ? `<${tagName}${
      e.url ? ` ${tagName === 'img' ? 'src' : 'href'}="${e.url.replace(/"/g, '&quot;')}"` : ''
    } ${
      tagName === 'img' && e.imageWidth ? `width="${imageWidth}"` : ''
    } ${
      tagName === 'img' && e.imageHeight ? `height="${imageHeight}"` : ''
    }>` : `</${tagName}>`;
    return { tag, position };
  })).flat()
    // close tags should be closed first
    .sort((a, b) => a.position === b.position ? a.tag.indexOf('</') - b.tag.indexOf('</') : b.position - a.position);

  const buffer = Buffer.from(text, 'utf16le');
  const stack: string[] = [];
  let lastPosition = buffer.length / 2;
  for (const { tag, position } of tagsReversed) {
    stack.push(escapeHTML(buffer.subarray(position * 2, lastPosition * 2).toString('utf16le')));
    stack.push(tag);
    lastPosition = position;
  }
  stack.push(escapeHTML(buffer.subarray(0, lastPosition * 2).toString('utf16le')));
  return stack.reverse().join('');
};
