const xhs = require('../modules/xhs');

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

const makeReplyMarkup = (currentIndex, totalLength) => ({
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
      text: '🎲',
      callback_data: 'tudou:random',
    },
  ]],
});

const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');

module.exports = async (ctx) => {
  const notes = await xhs.getXhsNotes('5d85f6a600000000010037d8');

  const renderNote = (note, message) => {
    const { id, index, noteCard } = note;
    const { title, time, desc, video } = noteCard;
    const link = `https://www.xiaohongshu.com/explore/${id}`;
    const caption = `[${escape(title)}](${link})\n${escape(desc)}`;
    const firstVideoSource = [
      ...video.media.stream.h264,
      ...video.media.stream.h265,
      ...video.media.stream.av1,
    ][0];
    const videoUrl = firstVideoSource && firstVideoSource.masterUrl;
    const replyMarkup = makeReplyMarkup(index, notes.length);
    if (!videoUrl) {
      if (message) {
        return ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, caption);
      }
      return ctx.telegram.sendMessage(ctx.message.chat.id, caption, {
        ...msgOptions,
        reply_markup: replyMarkup,
      });
    }
    if (message) {
      return ctx.telegram.editMessageMedia(message.chat.id, message.message_id, undefined, {
        type: 'video',
        media: videoUrl,
        caption,
      });
    }
    ctx.telegram.sendVideo(ctx.message.chat.id, videoUrl, {
      caption,
      ...msgOptions,
      reply_markup: replyMarkup,
    });
  };

  if (ctx.callbackQuery) {
    const { data, message } = ctx.callbackQuery;
    if (data === 'tudou:random') {
      const note = notes[Math.floor(Math.random() * notes.length)];
      return renderNote(note, message);
    }
    const index = parseInt(data.split(':')[1]);
    const note = notes[index];
    return renderNote(note, message);
  }
  renderNote(notes[0]);
};
