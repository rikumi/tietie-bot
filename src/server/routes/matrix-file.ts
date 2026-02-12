import { IncomingMessage, ServerResponse } from 'http';
import matrixClient from '../../clients/matrix';
import { request } from 'https';

export const ROUTE = /^\/mxc\/(.+)\/(.+)$/;

const fileHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const serverDomain = RegExp.$1;
  const fileId = RegExp.$2;
  if (!serverDomain || !fileId) {
    res.writeHead(404, 'Not Found').end();
    return;
  }
  const url = await matrixClient.bot.doRequest('GET', `/_matrix/client/v1/media/download/${serverDomain}/${fileId}`)

  console.log('[Server] MatrixFileHandler fetching url:', url.toString());

  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());
  console.log('[Server] MatrixFileHandler got headers:', fetchRes.headers);
  res.writeHead(200, 'OK', fetchRes.headers);
  fetchRes.pipe(res);
};

export default fileHandler;
