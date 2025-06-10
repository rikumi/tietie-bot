import http, { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import config from '../../config.json';

const routesDir = path.resolve(__dirname, 'routes');

const handlers = fs.readdirSync(routesDir, { recursive: true }).map(file => {
  file = file.toString();
  if (!/\.ts$/.test(file)) return;
  try {
    const { default: handler, ROUTE: customRoute } = require(path.resolve(routesDir, file));
    const route = customRoute ?? file.replace(/\.ts$/, '');
    console.log('[Server] Registered route:', file);
    return { route, handler };
  } catch (e) {
    console.warn('[Server] Registering route failed:', e);
  }
}).filter(Boolean);

const server = http.createServer((req, res) => {
  let isHandled = false;
  const pathname = req.url?.split(/\?#/g)[0].replace(/(?<=.)\/$/g, '') ?? '';
  const use = (matcher: string | RegExp, handler: (req: IncomingMessage, res: ServerResponse) => void) => {
    if (typeof matcher === 'string' ? matcher === pathname : matcher.test(pathname)) {
      console.log('[Server] Handling route:', pathname);
      isHandled = true;
      return handler(req, res);
    }
  };
  handlers.forEach((handler) => handler && use(handler?.route, handler?.handler));
  if (!isHandled) {
    console.warn('[Server] No handler for:', pathname);
    res.writeHead(404);
    res.end();
  }
});

export const startServer = () => {
  server.listen(config.server.port ?? 8383);
};
