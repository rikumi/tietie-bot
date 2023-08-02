const path = require('path');
const cp = require('child_process');

const exec = async (command, options) => {
  return await new Promise((resolve, reject) => {
    cp.exec(command, options, (error, stdout) => {
      if (error) reject(error);
      else resolve(stdout.toString('utf8'));
    });
  });
};

module.exports = async (ctx) => {
  const cwd = path.resolve(__dirname, '..');
  const message = await ctx.reply('代码更新执行中');
  const pullResult = await exec('git pull', { cwd });
  await ctx.telegram.editMessageText(message.chat.id, message.message_id, undefined, pullResult);
  cp.spawn('npm', ['run', 'restart'], { cwd }).unref();
};
