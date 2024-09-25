import { GenericMessage } from 'src/clients/base';
import { delPuppet, setPuppet } from 'src/database/puppet';

export const USAGE = `<bot_token> | clear - (Beta) (仅非 Telegram 用户可用) 设置自己在 Telegram 的假人 bot，用于代理发送消息`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const token = message.text.split(/\s+/)[1];
  if (message.clientName === 'telegram' || !token) {
    return `用法: /puppet ${USAGE}`;
  }
  if (token === 'clear') {
    await delPuppet(message.userId);
    return 'OK';
  }
  await setPuppet(message.userId, token);
  return 'OK';
}
