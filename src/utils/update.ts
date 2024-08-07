import path from 'path';
import cp from 'child_process';
import { MessageToSend } from 'src/clients/base';
import { getUpdateReceivers } from 'src/database/update';
import defaultClientSet from 'src/clients';

const exec = async (command: string, options: cp.ExecOptions) => {
  return await new Promise<string>((resolve, reject) => {
    cp.exec(command, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
};

export const getCurrentBranchName = async () => {
  const cwd = path.resolve(__dirname, '..');
  return (await exec('git branch --show-current', { cwd })).trim();
};

export const unsafeUpdateBot = async (
  branch?: string,
  onPullFinished?: (pullResult: string) => Promise<void>,
  onBranchSwitched?: (pullResult: string, switchBranchResult: string) => Promise<void>,
) => {
  const cwd = path.resolve(__dirname, '..');
  const pullResult = await exec('git pull', { cwd });

  await onPullFinished?.(pullResult);

  if (pullResult.trim() === 'Already up to date.') {
    return;
  }
  if (branch && /^[\w/]+$/.test(branch)) {
    const switchResult = await exec(`git switch ${branch}`, { cwd });
    await onBranchSwitched?.(pullResult, switchResult);
  }
  cp.spawnSync('pnpm', ['i'], { cwd });
  cp.spawn('npm', ['run', 'restart'], { cwd }).unref();
};

export const notifyAllUpdateReceivers = async (title: string, content: string = '') => {
  const updateReceivers = await getUpdateReceivers();
  await Promise.all(updateReceivers.map(receiver => defaultClientSet.sendBotMessage({
    clientName: receiver.clientName,
    chatId: receiver.chatId,
    text: `${title}\n\n${content}`.trim(),
    entities: [{ type: 'bold' as const, offset: 0, length: Buffer.from(title, 'utf16le').length / 2 }],
  })));
};
