import { IncomingMessage, ServerResponse } from 'http';
import discordBot from 'src/clients/discord-bot';

export const ROUTE = /^\/discord-invite$/;

const discordInviteHandler = async (req: IncomingMessage, res: ServerResponse) => {
  res.writeHead(302, 'Redirecting', {
    'location': discordBot.getInviteLink(),
  });
  res.end();
};

export default discordInviteHandler;
