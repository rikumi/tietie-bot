import { IncomingMessage, ServerResponse } from 'http';
import { fileIdToUrl } from '../../clients/telegram';
import { getTelegramFileId } from 'src/database/tgfile';

export const ROUTE = /^\/(tgs|tgsuniq)\/(.*?)$/;

const telegramStickerHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const isUniqueId = RegExp.$1 === 'tgsuniq';
  const id = RegExp.$2;
  if (!id) {
    res.writeHead(404, 'Not Found').end();
    return;
  }

  const fileId = isUniqueId ? await getTelegramFileId(id) : id;
  const url = await fileIdToUrl(fileId, null, 'application/json', true);

  console.log('[Server] TelegramStickerHandler fetching url:', url.toString());

  res.writeHead(200, 'OK', {
    'content-type': 'text/html',
  });
  res.write(Buffer.from(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>贴贴 Bot TGS Player</title>
      <script src="https://unpkg.com/@dotlottie/player-component@latest/dist/dotlottie-player.mjs" type="module"></script>
    </head>
    <body>
      <dotlottie-player src="${url}" background="transparent" speed="1" style="width: 300px; height: 300px" direction="1" playMode="normal" loop controls autoplay></dotlottie-player>
    </body>
    </html>
  `).toString());

  res.end();
};

export default telegramStickerHandler;
