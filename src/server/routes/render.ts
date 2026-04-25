import { IncomingMessage, ServerResponse } from 'http';
import { GenericMessageEntity } from '../../clients/base';
import { renderEntitiesToHTML } from '../../utils/message-render';

export const ROUTE = /^\/render\/(.*?)$/;

const messageRenderHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const message = JSON.parse(Buffer.from(RegExp.$1, 'base64'));
  if (!message) {
    res.writeHead(404, 'Not Found').end();
    return;
  }
  res.writeHead(200, 'OK', {
    'content-type': 'text/html',
  });
  res.write(Buffer.from(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>贴贴 Bot Message Render</title>
    </head>
    <body>
      ${renderEntitiesToHTML(message.entities, message.text)}
    </body>
    </html>
  `).toString());

  res.end();
};

export default messageRenderHandler;