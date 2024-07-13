import { IncomingMessage, ServerResponse } from 'http';
import { getStreamContent } from 'src/utils/stream';

export const ROUTE = '/github-webhook';

const githubWebhookHandler = async (req: IncomingMessage, res: ServerResponse) => {
  const body = JSON.parse((await getStreamContent(req)).toString('utf-8'));
  console.log('/github-webhook', JSON.stringify(body, null, 2));
  res.writeHead(200);
  res.end();
};

export default githubWebhookHandler;
