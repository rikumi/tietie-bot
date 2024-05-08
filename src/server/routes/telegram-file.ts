import { IncomingMessage, ServerResponse } from 'http';
import telegramClient from '../../clients/telegram';
import { request } from 'https';
import { getTelegramFileId } from 'src/database/tgfile';

export const ROUTE = /^\/(tgfile|tguniq)\/(.+)\/(.*?)$/;

const fileHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const isUniqueId = RegExp.$1 === 'tguniq';
  const mimeType = RegExp.$2;
  const id = RegExp.$3;
  if (!id || !mimeType) {
    res.writeHead(404, 'Not Found').end();
    return;
  }
  const fileId = isUniqueId ? await getTelegramFileId(id) : id;

  // the link has the bot token and should never be exposed to the user
  const url = await telegramClient.bot.telegram.getFileLink(fileId);

  console.log('[Server] TelegramFileHandler fetching url:', url.toString());
  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());

  console.log('[Server] TelegramFileHandler got headers:', fetchRes.headers);
  res.writeHead(200, 'OK', {
    'content-type': mimeType,
    'content-length': fetchRes.headers['content-length'],
  });
  fetchRes.pipe(res);
};

export default fileHandler;
