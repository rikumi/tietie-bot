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
  const keywords = ctx.message.text.trim().split(/\s+/).slice(1);
  const notes = await xhs.getXhsNotes('5d85f6a600000000010037d8');

  const renderNote = async (note, index, messageToEdit) => {
    const { note_id: id, display_title: title } = note;
    const link = `https://www.xiaohongshu.com/explore/${id}`;
    const caption = `[${escape(title)}](${link})`;
    const replyMarkup = makeReplyMarkup(index, notes.length);
    const videoUrl = await xhs.getNoteVideoUrl(id);
    if (!videoUrl) {
      if (messageToEdit) {
        return ctx.telegram.editMessageText(messageToEdit.chat.id, messageToEdit.message_id, undefined, caption, {
          ...msgOptions,
          reply_markup: replyMarkup,
        });
      }
      return ctx.telegram.sendMessage(ctx.message.chat.id, caption, {
        ...msgOptions,
        reply_markup: replyMarkup,
      });
    }
    if (messageToEdit) {
      return ctx.telegram.editMessageMedia(messageToEdit.chat.id, messageToEdit.message_id, undefined, {
        type: 'video',
        media: videoUrl,
        caption,
        ...msgOptions,
      }, {
        reply_markup: replyMarkup,
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
      const index = Math.floor(Math.random() * notes.length);
      return await renderNote(notes[index], index, message);
    }
    const index = parseInt(data.split(':')[1]);
    return await renderNote(notes[index], index, message);
  }
  const searchResultIndex = notes.findIndex((note) => keywords.some(keyword => note.noteCard.title.includes(keyword))) || 0;
  return await renderNote(notes[searchResultIndex], searchResultIndex);
};
