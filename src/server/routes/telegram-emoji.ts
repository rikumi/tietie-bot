import { IncomingMessage, ServerResponse } from 'http';
import telegramClient, { fileIdToTGSPreviewUrl, fileIdToUrl } from '../../clients/telegram';

export const ROUTE = /^\/tgmoji\/(.+)$/;

const customEmojiPreviewHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const emojiId = RegExp.$1;

  const [sticker] = await telegramClient.bot.telegram.getCustomEmojiStickers([emojiId]);

  const mimeType = sticker.is_video ? 'video/webm' : 'image/jpeg';
  const url = sticker?.is_animated
    // Special processing of TGS (Lottie) animated stickers
    ? await fileIdToTGSPreviewUrl(sticker.file_id, sticker.file_unique_id!)
    : await fileIdToUrl(sticker.file_id, sticker.file_unique_id!, mimeType);

  res.writeHead(302, 'Found', {
    Location: url,
  });
  res.end();
};

export default customEmojiPreviewHandler;
