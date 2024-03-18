import { ICommonMessageContext } from 'typings';
import { pickVideo } from '../database/video_reply';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const chatId = String(ctx.message.chat.id);
  const videoId = await pickVideo(chatId);

  if (videoId) {
    ctx.telegram.sendVideo(chatId, videoId, {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true,
    });
  }
};
