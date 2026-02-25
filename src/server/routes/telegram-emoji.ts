import { IncomingMessage, ServerResponse } from 'http';
import telegramClient, { fileIdToTGSPreviewUrl, fileIdToUrl } from '../../clients/telegram';
import { request } from 'https';

export const ROUTE = /^\/temoji\/(.+)$/;

const customEmojiPreviewHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const emojiId = RegExp.$1;

  const [sticker] = await telegramClient.bot.telegram.getCustomEmojiStickers([emojiId]);

  const mimeType = sticker.is_video ? 'video/webm' : 'image/jpeg';
  const url = sticker?.is_animated
    // Special processing of TGS (Lottie) animated stickers
    ? await fileIdToTGSPreviewUrl(sticker.file_id, sticker.file_unique_id!)
    : await fileIdToUrl(sticker.file_id, sticker.file_unique_id!, mimeType);

  const fetchRes = await new Promise<IncomingMessage>(r => request(url).on('response', r).end());
  const headers: any = {
    'content-type': mimeType,
    'content-length': fetchRes.headers['content-length'],
  };
  res.writeHead(200, 'OK', headers);
  fetchRes.pipe(res);
};

export default customEmojiPreviewHandler;
