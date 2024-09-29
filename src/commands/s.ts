import defaultClientSet from 'src/clients';
import { GenericMessage } from 'src/clients/base';
import { getFavoriteSticker, setFavoriteSticker } from 'src/database/sticker';

export const USAGE = `[save] <name> 为自己收藏或调用已收藏的贴纸`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const cmd = message.text.split(/\s+/)[1];
  if (cmd === 'save') {
    const name = message.text.split(/\s+/)[2];
    if (!name || name.length < 2) {
      return '关键词需要至少两个字符';
    }
    const sticker = message.messageReplied?.media;
    if (!sticker) {
      return '请回复一个贴纸';
    }
    await setFavoriteSticker(message.userId, name, sticker);
    return 'OK';
  }

  if (!cmd) {
    return `用法: /s ${USAGE}`;
  }

  const sticker = await getFavoriteSticker(message.userId, cmd);
  if (!sticker) {
    return '未找到对应的贴纸';
  }
  defaultClientSet.replicateMessageForUser({
    ...message,
    text: '',
    media: sticker,
  });
  message.disableBridging = true;
};
