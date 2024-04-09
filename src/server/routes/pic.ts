import { IncomingMessage, ServerResponse } from 'http';
import { bot } from '../../index';
import { fileIdMap } from 'src/modules/describe';
import { request } from 'https';

export const ROUTE = /^\/p\/(.+)$/;

const picHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const photoId = RegExp.$1;
  const fileId = fileIdMap.get(photoId);
  if (!fileId) {
    res.writeHead(404, 'Not Found').end();
    return;
  }

  // the link has the bot token and should never be exposed to the user
  const url = await bot.telegram.getFileLink(fileId);

  console.log('[SERVER][pic] fetching url:', url);
  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());

  console.log('[SERVER][pic] got headers:', fetchRes.headers);
  res.writeHead(200, 'OK', {
    'content-type': 'image/jpeg',
    'content-length': fetchRes.headers['content-length'],
  });
  fetchRes.pipe(res);
};

export default picHandler;
