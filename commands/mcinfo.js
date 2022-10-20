const mc = require('minecraft-protocol');

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
};

const escape = (text) => text.replace(/([\u0000-\u00ff])/g, '\\$1');

module.exports = (ctx, bot) => {
  const { message } = ctx;
  const server = message.text.trim().split(/\s+/)[1];
  const hostPort = /^([\w\.-]+)(\:\d+)?$/.exec(server);
  if (!hostPort) return 'Invalid server address';
  const [host, port = 25565] = hostPort.slice(1);

  (async () => {
    const result = await mc.ping({ host, port });
    const { version, players, description, favicon, latency } = result;
    ctx.reply(
      [
        `**${escape(description.text)}${escape(description.extra.map((k) => k.text).join(''))}**`,
        `Version: ${escape(version.name)}`,
        `Online Players: ${players.online}/${players.max}`,
      ].join('\n'),
      msgOptions
    );
  })();
};
