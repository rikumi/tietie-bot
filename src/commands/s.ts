import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { addSticker, getSticker } from '../database/sticker';

export const USAGE = `<贴纸名称> 发送已收藏的贴纸 | 回复贴纸消息并使用 /s <名称> 收藏该贴纸`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const args = message.text.trim().split(/\s+/).slice(1);
  const stickerName = args.join(' ').trim();

  // 设置不转发到其他平台
  message.disableBridging = true;

  const replyWithoutBridging = async (text: string) => {
    await defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: `${text}\n\n该消息仅在当前平台可见`,
      disableBridging: true,
      messageIdReplied: message.messageId,
    });
    return undefined;
  };

  if (!stickerName) {
    return await replyWithoutBridging('用法: /s <贴纸名称>');
  }

  // 如果有回复消息，且回复的是 Telegram 贴纸，则收藏该贴纸
  const stickerFileId = message.messageReplied?.bridgedMessage?.media?.telegramFileId;
  if (message.messageReplied && message.messageReplied.media?.type === 'sticker' && stickerFileId) {
    // 检查该名称是否已被用户使用
    const existingSticker = await getSticker(message.userId, message.clientName, stickerName);
    if (existingSticker) {
      return await replyWithoutBridging(`你已经使用过名称 "${stickerName}" 收藏了其他贴纸，请使用不同的名称。`);
    }

    await addSticker(message.userId, message.clientName, stickerName, stickerFileId);
    return await replyWithoutBridging(`已收藏贴纸为 "${stickerName}"。`);
  }

  // 如果没有回复消息，则发送指定名称的贴纸
  const sticker = await getSticker(message.userId, message.clientName, stickerName);
  if (!sticker) {
    return await replyWithoutBridging(`未找到名称为 "${stickerName}" 的贴纸。`);
  }

  // 发送贴纸，附上发送者名字
  const senderName = message.userDisplayName || message.userHandle || 'Unknown';
  const text = `${senderName}`;

  await defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text,
    media: {
      type: 'sticker',
      url: '',
      mimeType: 'image/jpeg',
      size: 0,
      telegramFileId: sticker.telegram_file_id,
    },
    disableBridging: true,
    bridgedMessage: {
      ...message,
      userDisplayName: senderName,
      userHandle: message.userHandle || senderName,
    },
  });

  return undefined; // 返回 undefined 表示不发送文本回复
};
