import { GenericMessage } from 'src/clients/base';
import { setVideoReply, getVideoReply } from '../database/video_reply';
import defaultClientSet from 'src/clients';

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
      mediaType: 'video',
      mediaUrl: videoId,
      text: '',
      messageIdReplied: message.messageId,
      rawMessageExtra: { disable_notification: true },
    });
    return true;
  }
  return false;
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const command = message.text.trim().split(/\s+/)[1];
  const replied = message.rawMessageReplied;
  if (!command || !replied || !replied.video) {
    return '用法：引用视频消息并回复 /set_video <响应指令名>';
  }
  const fileId = replied.video.file_id;
  await setVideoReply(message.clientName, message.chatId, command, fileId);
  return 'OK';
};
