import { GenericMessage } from 'src/clients/base';
import { pickVideo } from '../database/video_reply';
import defaultClientSet from 'src/clients';
import { fileIdToUrl } from 'src/clients/telegram';

export const USAGE = `从视频指令中随机选择一个视频发送`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const videoId = await pickVideo(message.clientName, message.chatId);

  if (videoId) {
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: '',
      media: {
        type: 'video',
        url: await fileIdToUrl(videoId, null, 'video/mp4'),
        mimeType: 'video/mp4',
        size: 0,
      },
      messageIdReplied: message.messageId,
      rawMessageExtra: { disable_notification: true },
    });
  }
};
