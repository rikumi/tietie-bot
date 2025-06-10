import { IncomingMessage, ServerResponse } from 'http';
import config from '../../../config.json';

export const ROUTE = '/';

const indexHandler = (req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(302, 'Moved', {
    'Location': config.server.fallbackUrl || 'https://rkm.mx',
  });
  res.end();
};

export default indexHandler;
