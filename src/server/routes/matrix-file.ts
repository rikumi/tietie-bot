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
  const fetchRes = await matrixClient.bot.doRequest(
    'GET', `/_matrix/client/v1/media/download/${serverDomain}/${fileId}`,
    null, null, 60000, true, 'application/json',
    /* noEncoding: */ true,
  );

  const returningHeaders = {
    'Content-Disposition': fetchRes.headers['content-disposition'],
    'Content-Encoding': fetchRes.headers['content-encoding'],
    'Content-Length': fetchRes.headers['content-length'],
    'Content-Type': fetchRes.headers['content-type'],
  };
  console.log('MatrixFileHandler fetchRes', returningHeaders, fetchRes.body);

  res.writeHead(200, 'OK', returningHeaders);
  res.write(fetchRes.body);
  res.end();
};

export default fileHandler;
