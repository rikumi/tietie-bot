import { GenericMessage } from 'src/clients/base';
import * as xhs from '../utils/xhs';
import dayjs from 'dayjs';
import defaultClientSet from 'src/clients';
import { createShortUrl } from 'src/database/shorturl';

const rawMessageExtra = {
  disable_web_page_preview: true,
  disable_notification: true,
} as const;

const handle = async (message: GenericMessage) => {
  let notesLength = 0;
  const renderNote = async ({ id, index }: any) => {
    const link = `https://www.xiaohongshu.com/discovery/item/${id}`;
    const note = await xhs.getXhsNoteDetail(id);
    const caption = [
      note.title,
      note.desc.replace(/\[话题]/g, '').replace(/#(.+?)#/g, ' #$1 ').replace(/ +/g, ' '),
      ' ',
      await createShortUrl(link),
      `🐱 ${dayjs(note.time).format('M/D H:mm')}`,
      `💗 ${note.interactInfo.likedCount} | ⭐️ ${note.interactInfo.collectedCount} | 💬 ${note.interactInfo.commentCount}`,
      ' ',
      index < notesLength - 1 ? `➡️ 使用 /tudou ${index + 1} 查看下一条` : `⏩ 已看完最近 ${notesLength} 条更新`,
      '🎲 使用 /tudou random 随机查看',
    ].filter(k => k).join('\n');

    const videoUrl = note.video ? note.video.media.stream.h264[0].masterUrl : undefined;
    const firstPhotoUrl = note.imageList ? note.imageList[0].infoList.slice(-1)[0].url : '';
    try {
      await defaultClientSet.sendBotMessage({
        clientName: message.clientName,
        chatId: message.chatId,
        media: {
          type: videoUrl ? 'video' : 'photo',
          url: videoUrl || firstPhotoUrl || 'https://upload.wikimedia.org/wikipedia/en/4/48/Blank.JPG',
          mimeType: videoUrl ? 'video/mp4' : 'image/jpeg',
          size: 0,
        },
        text: caption,
        rawMessageExtra,
      });
    } catch (e) {
      await defaultClientSet.sendBotMessage({
        clientName: message.clientName,
        chatId: message.chatId,
        text: `[发送媒体文件失败]\n\n${caption}`,
        rawMessageExtra,
      });
    }
  };
  try {
    const notes = await xhs.getXhsNotes('5d85f6a600000000010037d8');
    notesLength = notes.length;
    const requestedIndex = message.text.split(/\s+/)[1];
    if (requestedIndex) {
      if (requestedIndex === 'random') {
        const note = notes[Math.floor(Math.random() * notes.length)];
        return await renderNote(note);
      }
      const index = parseInt(requestedIndex);
      const note = notes[index];
      return await renderNote(note);
    }
    await renderNote(notes[0]);
  } catch (e) {
    console.error(e);
    return '找不到该稿件或稿件数据格式有误，请再试一次';
  }
};

export {
  handle as handleSlashCommand,
  handle as handleInteraction,
};
