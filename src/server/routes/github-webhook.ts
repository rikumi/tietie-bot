import { IncomingMessage, ServerResponse } from 'http';
import { getStreamContent } from 'src/utils/stream';
import { getCurrentBranchName, unsafeUpdateBot } from 'src/utils/update';

export const ROUTE = '/github-webhook';

const githubWebhookHandler = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.headers['X-GitHub-Event'] !== 'push') {
    return;
  }
  // do not trust the content until we begin to check secret here
  const body = JSON.parse((await getStreamContent(req)).toString('utf-8'));
  console.log('/github-webhook', JSON.stringify(body, null, 2));

  const { ref, head_commit: headCommit } = body;
  const currentBranch = await getCurrentBranchName();
  if (ref === `refs/heads/${currentBranch}` && !headCommit?.message?.includes('skip ci')) {
    unsafeUpdateBot();
  }
  res.writeHead(200);
  res.end();
};

export default githubWebhookHandler;
