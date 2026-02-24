import { GenericMessage } from 'src/clients/base';
import { isDiscordWebhookEnabled, setDiscordWebhookEnabled } from 'src/database/discord';

export const USAGE = `<on|off> 开启/关闭 Discord Webhook 假人功能`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const control = message.text.split(/\s+/)[1];
  if (message.clientName !== 'discord') {
    return '此命令仅在 Discord 上可用。';
  }
  if (!['on', 'off'].includes(control)) {
    const current = await isDiscordWebhookEnabled(message.chatId);
    return `当前会话 Discord Webhook 假人功能已${current ? '开启' : '关闭'}，使用 /discord webhook ${current ? 'off' : 'on'} 来切换`;
  }
  if (control === 'on') {
    await setDiscordWebhookEnabled(message.chatId, true);
    return '已为当前会话开启 Discord Webhook 假人功能。';
  } else {
    await setDiscordWebhookEnabled(message.chatId, false);
    return '已为当前会话关闭 Discord Webhook 假人功能。';
  }
};
