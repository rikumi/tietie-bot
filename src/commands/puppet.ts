import { DefaultClientSet } from 'src/clients';
import { GenericMessage } from 'src/clients/base';
import { delPuppets, setPuppet } from 'src/database/puppet';

export const USAGE = `<platform_name> <access_token> [home_server] | clear - 设置自己在另外平台的假人账号（Telegram Bot / Matrix Access Token），用来代替自己发送被桥接的消息`;

const validClients: readonly string[] = DefaultClientSet.CLIENT_NAMES;

export const handleSlashCommand = async (message: GenericMessage) => {
  const [, toClientName, token, homeServer = 'matrix.org'] = message.text.split(/\s+/);
  if (toClientName === 'clear') {
    await delPuppets(message.clientName, message.userId);
    return 'OK';
  }
  if (!validClients.includes(toClientName) || message.clientName === toClientName || !token) {
    return `用法: /puppet ${USAGE}`;
  }
  const tokenWithHomeServer = toClientName === 'matrix' ? `${token}@${homeServer}` : token;
  await setPuppet(message.clientName, message.userId, toClientName, tokenWithHomeServer);
  return 'OK';
}
