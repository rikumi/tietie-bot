import { GenericMessage } from 'src/clients/base';
import * as xhs from '../utils/xhs';
import dayjs from 'dayjs';
import defaultClientSet from 'src/clients';
import { createShortUrl } from 'src/database/shorturl';

const rawMessageExtra = {
  disable_web_page_preview: true,
  disable_notification: true,
} as const;

const makeInteractions = (currentIndex: number, totalLength: number) => ([
  ...(currentIndex > 0 ? [{
    command: `tudou:${currentIndex - 1}`,
    icon: '⬅️',
    description: '上一条',
  }] : []),
  ...(currentIndex < totalLength - 1 ? [{
    command: `tudou:${currentIndex + 1}`,
    icon: '➡️',
    description: '下一条',
  }] : []),
  {
    command: `tudou:${currentIndex}`,
    icon: '🔁',
    description: '刷新',
  },
  {
    command: 'tudou:random',
    icon: '🔀',
    description: '随机',
  },
]);

const handle = async (message: GenericMessage, interaction?: string) => {
  let notesLength = 0;
  const renderNote = async ({ id, index }: any, messageToEdit?: GenericMessage) => {
    const link = `https://www.xiaohongshu.com/discovery/item/${id}`;
    const note = await xhs.getXhsNoteDetail(id);
    const caption = [
      note.title,
      note.desc.replace(/\[话题]/g, '').replace(/#(.+?)#/g, ' #$1 ').replace(/ +/g, ' '),
      ' ',
      await createShortUrl(link),
      `🐱 ${dayjs(note.time).format('M/D H:mm')}`,
      `💗 ${note.interactInfo.likedCount} | ⭐️ ${note.interactInfo.collectedCount} | 💬 ${note.interactInfo.commentCount}`,
    ].filter(k => k).join('\n');

    const videoUrl = note.video ? note.video.media.stream.h264[0].masterUrl : undefined;
    const firstPhotoUrl = note.imageList ? note.imageList[0].infoList.slice(-1)[0].url : '';
    const interactions = makeInteractions(index, notesLength);
    try {
      await defaultClientSet[messageToEdit ? 'editBotMessage' : 'sendBotMessage']({
        clientName: (messageToEdit ?? message).clientName,
        chatId: (messageToEdit ?? message).chatId,
        messageId: messageToEdit?.messageId ?? '',
        media: {
          type: videoUrl ? 'video' : 'photo',
          url: videoUrl || firstPhotoUrl || 'https://upload.wikimedia.org/wikipedia/en/4/48/Blank.JPG',
          mimeType: videoUrl ? 'video/mp4' : 'image/jpeg',
          size: 0,
        },
        text: caption,
        rawMessageExtra,
        interactions,
      });
    } catch (e) {
      await defaultClientSet[messageToEdit ? 'editBotMessage' : 'sendBotMessage']({
        clientName: (messageToEdit ?? message).clientName,
        chatId: (messageToEdit ?? message).chatId,
        messageId: messageToEdit?.messageId ?? '',
        media: {
          type: 'photo',
          url: 'https://upload.wikimedia.org/wikipedia/en/4/48/Blank.JPG',
          mimeType: 'image/jpeg',
          size: 0,
        },
        text: `[发送媒体文件失败]\n\n${caption}`,
        rawMessageExtra,
        interactions,
      });
    }
  };
  try {
    const notes = await xhs.getXhsNotes('5d85f6a600000000010037d8');
    notesLength = notes.length;
    if (interaction) {
      if (interaction === 'tudou:random') {
        const note = notes[Math.floor(Math.random() * notes.length)];
        return await renderNote(note, message);
      }
      const index = parseInt(interaction.split(':')[1]);
      const note = notes[index];
      return await renderNote(note, message);
    }
    await renderNote(notes[0]);
  } catch (e) {
    console.error(e);
    return '小红书的返回数据不合格式，请再试一次';
  }
};

export {
  handle as handleSlashCommand,
  handle as handleInteraction,
};
