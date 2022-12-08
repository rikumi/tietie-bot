const mc = require('minecraft-protocol');

module.exports = async (ctx) => {
  const { message } = ctx;
  const server = message.text.trim().split(/\s+/)[1];
  const hostPort = /^([\w\.-]+)(\:\d+)?$/.exec(server);
  if (!hostPort) return 'Invalid server address';
  const [host, port = 25565] = hostPort.slice(1);
  if (!host || !port) return 'Invalid server address';
  const result = await mc.ping({ host, port });
  const { version, players, description } = result;
  return [
    `${description.text}${description.extra.map((k) => k.text).join('')}`,
    `Version: ${version.name}`,
    `Online Players: ${players.online}/${players.max}`,
  ].join('\n');
};
