import path from 'path';
import cp from 'child_process';
import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';

export const USAGE = `更新代码并重启 (管理员使用)`;

const exec = async (command: string, options: cp.ExecOptions) => {
  return await new Promise<string>((resolve, reject) => {
    cp.exec(command, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
};

export const handleSlashCommand = async (message: GenericMessage) => {
  const branch = message.text?.split(/\s+/)[1];
  const cwd = path.resolve(__dirname, '..');
  const messagesSent = await defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text: '代码更新执行中',
    messageIdReplied: message.messageId,
  })!;
  const pullResult = await exec('git pull', { cwd });
  await messagesSent?.editAll({ text: pullResult });
  if (pullResult.trim() === 'Already up to date.') {
    return;
  }
  if (branch && /^[\w/]+$/.test(branch)) {
    const switchResult = await exec(`git switch ${branch}`, { cwd });
    await messagesSent?.editAll({ text: `${pullResult}\n\n${switchResult}` });
  }
  cp.spawnSync('pnpm', ['i'], { cwd });
  cp.spawn('npm', ['run', 'restart'], { cwd }).unref();
};
