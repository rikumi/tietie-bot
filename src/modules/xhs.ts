import config from '../../config.json';
import axios from 'axios';

export const getXhsNotes = async (userId: string) => {
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
  const notes = json.user.notes[0];
  console.log('xhs notes', notes);
  if (!notes.length) {
    throw new Error('帖子列表为空，登录态可能过期');
  }
  return notes;
};

export const getXhsNoteDetail = async (noteId: string) => {
  const { data } = await axios.get(`https://www.xiaohongshu.com/discovery/item/${noteId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      Cookie: `webId=${config.xhsWebId};web_session=${config.xhsWebSession}`,
    },
    timeout: 10000,
  });
  const match = data.match(/<script>window\.__INITIAL_STATE__=([\s\S]+?)<\/script>/);
  if (!match) return null;
  console.log('xhs note detail', match[1]);
  const json = JSON.parse(match[1].replace(/undefined/g, 'null'));
  return (Object.values(json.note.noteDetailMap)[0] as any).note;
};
