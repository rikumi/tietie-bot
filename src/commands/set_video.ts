import { ICommonMessageContext, IMaybeVideoMessage } from 'typings';
import { setVideoReply, getVideoReply } from '../database/video_reply';

export const handleMessage = async (ctx: ICommonMessageContext) => {
  if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith('/')) {
    return false;
  }
  const chatId = String(ctx.message.chat.id);
  const [command] = ctx.message.text.slice(1).split(/\s+/);
  const videoId = await getVideoReply(chatId, command);
  if (videoId) {
    ctx.telegram.sendVideo(ctx.message.chat.id, videoId, { reply_to_message_id: ctx.message.message_id });
    return true;
  }
  return false;
};

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const command = message.text!.trim().split(/\s+/)[1];
  const replied: IMaybeVideoMessage | undefined = message.reply_to_message;
  const chatId = String(ctx.message.chat.id);
  if (!command || !replied || !replied.video) {
    return '用法：引用视频消息并回复 /set_video <响应指令名>';
  }
  const fileId = replied.video.file_id;
  await setVideoReply(chatId, command, fileId);
  return 'OK';
};
