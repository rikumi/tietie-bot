import { GenericMessage } from 'src/clients/base';
import * as xhs from '../modules/xhs';
import dayjs from 'dayjs';

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
} as const;

const makeReplyMarkup = (currentIndex: number, totalLength: number) => ({
  inline_keyboard: [[
    ...(currentIndex > 0 ? [{
      text: '⬅️',
      callback_data: `tudou:${currentIndex - 1}`,
    }] : []),
    ...(currentIndex < totalLength - 1 ? [{
      text: '➡️',
      callback_data: `tudou:${currentIndex + 1}`,
    }] : []),
    {
      text: '🔄',
      callback_data: `tudou:${currentIndex}`,
    },
    {
      text: '🎲',
      callback_data: 'tudou:random',
    },
  ]],
});

const escape = (text = '') => text.replace(/([\u0000-\u007f])/g, '\\$1');

export const handleSlashCommand = async (_: GenericMessage | undefined, ctx: any) => {
  if (!ctx) return;
  const keywords = ctx.message ? ctx.message.text!.trim().split(/\s+/).slice(1) : [];
  const notes = await xhs.getXhsNotes('5d85f6a600000000010037d8');

  const renderNote = async ({ id, index }: any, message?: any) => {
    const link = `https://www.xiaohongshu.com/discovery/item/${id}`;
    const note = await xhs.getXhsNoteDetail(id);
    const caption = [
        `[${escape(note.title)}](${link})`,
        `${escape(note.desc)}`,
        ' ',
        `🐱 ${escape(dayjs(note.time).format('M/D H:mm'))} 发布于${escape(note.ipLocation)}`,
        `💗 ${escape(note.interactInfo.likedCount)} \\| ⭐️ ${escape(note.interactInfo.collectedCount)} \\| 💬 ${escape(note.interactInfo.commentCount)}`, // 里面可能有 + 号，需要转义
    ].filter(k => k).join('\n');

    const videoUrl = note.video ? note.video.media.stream.h264[0].masterUrl : undefined;
    const firstPhotoUrl = note.imageList ? note.imageList[0].infoList.slice(-1)[0].url : '';
    const replyMarkup = makeReplyMarkup(index, notes.length);
    if (!videoUrl) {
      if (message) {
        ctx.telegram.editMessageMedia(message.chat.id, message.message_id, undefined, {
          type: 'photo',
          media: firstPhotoUrl || 'https://placehold.co/600x400?text=No+Image',
          caption,
          ...msgOptions,
        }, {
          reply_markup: replyMarkup,
        });
        return;
      }
      ctx.telegram.sendMessage(ctx.message!.chat.id, caption, {
        ...msgOptions,
        reply_markup: replyMarkup,
      });
      return;
    }
    if (message) {
      ctx.telegram.editMessageMedia(message.chat.id, message.message_id, undefined, {
        type: 'video',
        media: videoUrl,
        caption,
        ...msgOptions,
      }, {
        reply_markup: replyMarkup,
      });
      return;
    }
    ctx.telegram.sendVideo(ctx.message!.chat.id, videoUrl, {
      caption,
      ...msgOptions,
      reply_markup: replyMarkup,
    });
  };

  if (ctx.callbackQuery) {
    const { data, message } = ctx.callbackQuery;
    if (data === 'tudou:random') {
      const note = notes[Math.floor(Math.random() * notes.length)];
      return await renderNote(note, message);
    }
    const index = parseInt(data!.split(':')[1]);
    const note = notes[index];
    return await renderNote(note, message);
  }

  const searchResultIndex = notes.findIndex((note: any) => keywords.some((keyword: string) => note.noteCard.title.includes(keyword)));
  if (keywords.length && searchResultIndex === -1) {
    return '最近的土豆视频中未找到相关内容';
  }
  await renderNote(notes[searchResultIndex || 0] || notes[0]);
};

export const handleCustomAction = (ctx: any) => handleSlashCommand(undefined, ctx);
