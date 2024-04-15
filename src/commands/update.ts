import path from 'path';
import cp from 'child_process';
import { ICommonMessageContext, IContext } from 'typings';

const exec = async (command: string, options: cp.ExecOptions) => {
  return await new Promise<string>((resolve, reject) => {
    cp.exec(command, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
};

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const branch = ctx.message.text?.split(/\s+/)[1];
  const cwd = path.resolve(__dirname, '..');
  const message = await (ctx as IContext).reply('代码更新执行中');
  const pullResult = await exec('git pull', { cwd });
  await ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, pullResult);
  if (branch && /^[\w/]+$/.test(branch)) {
    const switchResult = await exec(`git switch ${branch}`, { cwd });
    await ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, switchResult);
  }
  cp.spawnSync('pnpm', ['i'], { cwd });
  cp.spawn('npm', ['run', 'restart'], { cwd }).unref();
};
