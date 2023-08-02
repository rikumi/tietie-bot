const config = require('../config.json');
const axios = require('axios');

exports.getXhsNotes = async (userId) => {
  const { data } = await axios.get(`https://www.xiaohongshu.com/user/profile/${userId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      Cookie: `webId=${config.xhsWebId};web_session=${config.xhsWebSession}`,
    },
    timeout: 10000,
  });
  const match = data.match(/<script>window\.__INITIAL_STATE__=(.+?)<\/script>/);
  if (!match) return null;
  const json = JSON.parse(match[1].replace(/undefined/g, 'null'));
  console.log('xhs notes length', json.user.notes.length);
  return json.user.notes[0];
};
