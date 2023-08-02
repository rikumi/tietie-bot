const config = require('../config.json');
const axios = require('axios');

exports.getXhsNotes = async (userId) => {
  const { data } = await axios.get(`https://edith.xiaohongshu.com/api/sns/web/v1/user_posted?num=1000&user_id=${userId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      Cookie: `webId=${config.xhsWebId};web_session=${config.xhsWebSession}`,
    },
    timeout: 10000,
  });
  return data.data.notes;
};

exports.getNoteVideoUrl = async (noteId) => {
  const { data } = await axios.post('https://edith.xiaohongshu.com/api/sns/web/v1/feed', {
    source_note_id: noteId,
  }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      Cookie: `webId=${config.xhsWebId};web_session=${config.xhsWebSession}`,
    },
    timeout: 10000,
  });
  const stream = data.data.items[0].note_card.video.media.stream;
  const firstVideoSource = [...stream.h264, ...stream.h265, ...stream.av1][0];
  return firstVideoSource && firstVideoSource.masterUrl;
};
