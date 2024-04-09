import { IncomingMessage, ServerResponse } from 'http';

export const ROUTE = '/';

const indexHandler = (req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(302, 'Moved', {
    'Location': 'https://rkm.mx/'
  });
  res.end();
};

export default indexHandler;
