import { IncomingMessage, ServerResponse } from 'http';
import defaultClientSet from 'src/clients';
import { getUpdateReceivers } from 'src/database/update';
import { getStreamContent } from 'src/utils/stream';
import { getCurrentBranchName, unsafeUpdateBot } from 'src/utils/update';

export const ROUTE = '/github-webhook';

const githubWebhookHandler = async (req: IncomingMessage, res: ServerResponse) => {
  // do not trust the content until we begin to check secret here
  const body = JSON.parse((await getStreamContent(req)).toString('utf-8'));
  console.log('/github-webhook', req.headers, JSON.stringify(body, null, 2));
  if (req.headers['X-GitHub-Event'] !== 'push') {
    return;
  }

  const { ref, commits, head_commit: headCommit } = body;
  const currentBranch = await getCurrentBranchName();
  const changelog = commits.map((commit: any) => commit.message.split('\n')[0]).join('\n');
  if (ref === `refs/heads/${currentBranch}` && !headCommit?.message?.includes('skip ci')) {
    const updateReceivers = await getUpdateReceivers();
    await Promise.all(updateReceivers.map(receiver => defaultClientSet.sendBotMessage({
      clientName: receiver.clientName,
      chatId: receiver.chatId,
      text: `tietie-bot 自动更新中\n\n${changelog}`,
    })));
    unsafeUpdateBot();
  }
  res.writeHead(200);
  res.end();
};

export default githubWebhookHandler;
