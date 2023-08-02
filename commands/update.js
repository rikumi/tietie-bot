const path = require('path');
const cp = require('child_process');

const exec = async (command, args, options) => {
  await new Promise((resolve, reject) => {
    const child = cp.spawn(command, args, options);
    child.on('exit', (code) => code ? reject(`Process ${command} exited with code ${code}`) : resolve());
  });
};

module.exports = async (ctx) => {
  const cwd = path.resolve(__dirname, '..');
  await ctx.reply('代码更新执行中');
  await exec('git', ['pull'], { cwd });
  await ctx.reply('代码更新执行完成，即将重启');
  cp.spawn('npm', ['run', 'restart'], { cwd }).unref();
};
