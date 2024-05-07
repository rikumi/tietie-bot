import { GenericMessage } from 'src/clients/base';
import { pickVideo } from '../database/video_reply';
import defaultClientSet from 'src/clients';
import { fileIdToUrl } from 'src/clients/telegram';

export const handleSlashCommand = async (message: GenericMessage) => {
  const videoId = await pickVideo(message.clientName, message.chatId);

  if (videoId) {
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: '',
      mediaType: 'video',
      mediaUrl: fileIdToUrl(videoId, 'video/mp4'),
      messageIdReplied: message.messageId,
      rawMessageExtra: { disable_notification: true },
    });
  }
};
