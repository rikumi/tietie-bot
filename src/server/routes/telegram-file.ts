import { IncomingMessage, ServerResponse } from 'http';
import telegramClient from '../../clients/telegram';
import { request } from 'https';

export const ROUTE = /^\/tgfile\/(.+)\/(.*?)$/;

const fileHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const mimeType = RegExp.$1;
  const fileId = RegExp.$2;
  if (!fileId || !mimeType) {
    res.writeHead(404, 'Not Found').end();
    return;
  }

  // the link has the bot token and should never be exposed to the user
  const url = await telegramClient.bot.telegram.getFileLink(fileId);

  console.log('[SERVER][tgfile] fetching url:', url);
  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());

  console.log('[SERVER][tgfile] got headers:', fetchRes.headers);
  res.writeHead(200, 'OK', {
    'content-type': mimeType,
    'content-length': fetchRes.headers['content-length'],
  });
  fetchRes.pipe(res);
};

export default fileHandler;
