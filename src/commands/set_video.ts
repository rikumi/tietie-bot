import { GenericMessage } from 'src/clients/base';
import { setVideoReply, getVideoReply } from '../database/video_reply';
import defaultClientSet from 'src/clients';
import { fileIdToUrl } from 'src/clients/telegram';

export const USAGE = `<command> 将被引用的视频设置为视频指令`;

export const handleMessage = async (message: GenericMessage) => {
  if (!message.text.startsWith('/')) {
    return false;
  }
  const [command] = message.text.slice(1).split(/\s+/);
  const videoId = await getVideoReply(message.clientName, message.chatId, command);
  if (videoId) {
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      media: {
        type: 'video',
        url: /^https?:/.test(videoId) ? videoId : await fileIdToUrl(videoId, null, 'video/mp4'),
        mimeType: 'video/mp4',
        size: 0,
      },
      text: '',
      messageIdReplied: message.messageId,
    });
    return true;
  }
  return false;
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const command = message.text.trim().split(/\s+/)[1];
  const replied = message.messageReplied;
  if (!command || replied?.media?.type !== 'video') {
    return '用法：引用视频消息并回复 /set_video <响应指令名>';
  }
  const url = replied.media.url;
  await setVideoReply(message.clientName, message.chatId, command, url);
  return 'OK';
};
