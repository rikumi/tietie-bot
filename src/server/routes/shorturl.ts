import { IncomingMessage, ServerResponse } from 'http';
import { getOriginalUrl } from 'src/database/shorturl';

export const ROUTE = /^\/s\/(.+)$/;

const shortUrlHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const id = RegExp.$1;
  if (!id) {
    res.writeHead(404, 'Not Found').end();
    return;
  }

  // the link has the bot token and should never be exposed to the user
  const url = await getOriginalUrl(id);
  if (!url) {
    res.writeHead(404, 'Not Found').end();
  }
  res.writeHead(302, 'Redirecting', {
    'location': url,
  });
  res.end();
};

export default shortUrlHandler;
