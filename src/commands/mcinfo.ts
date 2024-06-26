import mc from 'minecraft-protocol';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `<server>[:port] 查询 Minecraft 服务器信息`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const server = message.text.trim().split(/\s+/)[1];
  const hostPort = /^([\w\.-]+)(\:\d+)?$/.exec(server);
  if (!hostPort) return 'Invalid server address';
  const [host, port = '25565'] = hostPort.slice(1);
  if (!host || !port) return 'Invalid server address';
  const result: mc.NewPingResult = await mc.ping({ host, port: parseInt(port) }) as any;
  const { version, players, description } = result;
  return [
    `${(description as any).text}${(description as any).extra.map((k: any) => k.text).join('')}`,
    `Version: ${version.name}`,
    `Online Players: ${players.online}/${players.max}`,
  ].join('\n');
};
