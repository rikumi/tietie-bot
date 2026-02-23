import { IncomingMessage, ServerResponse } from 'http';
import telegramClient from '../../clients/telegram';
import { request } from 'https';

export const ROUTE = /^\/tavatar\/(.+)$/;

const avatarHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const userId = RegExp.$1;

  const { photos } = await telegramClient.bot.telegram.getUserProfilePhotos(parseInt(userId, 10));
  const firstPic = photos[0][0];

  // the link has the bot token and should never be exposed to the user
  const url = await telegramClient.bot.telegram.getFileLink(firstPic.file_unique_id);

  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());
  console.log('[Server] TelegramFileHandler got headers:', 'image/jpeg', fetchRes.headers['content-length']);
  const headers: any = {
    'content-type': 'image/jpeg',
    'content-length': fetchRes.headers['content-length'],
  };
  res.writeHead(200, 'OK', headers);
  fetchRes.pipe(res);
};

export default avatarHandler;
