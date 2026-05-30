import { GenericMessage } from 'src/clients/base';
import telegram from 'src/clients/telegram';

export const USAGE = `查看被引用的 Telegram 消息内的动态照片`;

export const handleSlashCommand = (message: GenericMessage | undefined) => {
  if (message?.clientName !== 'telegram') {
    return '目前仅支持在 Telegram 端查看动态照片';
  }
  if (!message.messageReplied) {
    return '回复给其它消息以查看动态照片';
  }
  const live = message.messageReplied.platformMessage?.live_photo;
  const photoId = live?.photo?.slice(-1)[0]?.file_unique_id;
  const videoId = live?.file_unique_id;

  if (!live || !photoId || !videoId) {
    return '该消息不包含动态照片，请长按选择正确消息后再试';
  }
  telegram.bot.telegram.sendMediaGroup(message.chatId, [
    { type: 'photo', media: photoId },
    { type: 'video', media: videoId },
  ], {
    reply_parameters: {
      chat_id: message.chatId,
      message_id: Number(message.messageId),
    },
  });
};
