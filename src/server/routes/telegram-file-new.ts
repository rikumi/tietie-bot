import { IncomingMessage, ServerResponse } from 'http';
import telegramClient from '../../clients/telegram';
import { request } from 'https';
import { getTelegramFileId } from 'src/database/tgfile';
import mime from 'mime-types';

export const ROUTE = /^\/f\/([^.]+)\.(\w+)(\.gz)?$/;

const fileHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const id = RegExp.$1;
  const isUniqueId = id?.length === 16;
  const extension = RegExp.$2;
  const isGzip = !!RegExp.$3;
  const mimeType = mime.lookup(extension);

  if (!id || !mimeType) {
    res.writeHead(404, 'Not Found').end();
    return;
  }
  const fileId = isUniqueId ? await getTelegramFileId(id) : id;

  // the link has the bot token and should never be exposed to the user
  const url = await telegramClient.bot.telegram.getFileLink(fileId);

  console.log('[Server] TelegramFileHandler fetching url:', url.toString());

  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());
  console.log('[Server] TelegramFileHandler got headers:', mimeType, fetchRes.headers['content-length']);
  const headers: any = {
    'content-type': mimeType,
    'content-length': fetchRes.headers['content-length'],
  };
  if (isGzip) {
    headers['content-encoding'] = 'gzip';
  }
  res.writeHead(200, 'OK', headers);
  fetchRes.pipe(res);
};

export default fileHandler;
