import defaultClientSet from 'src/clients';
import { GenericMessage } from 'src/clients/base';

const SYMBOLS = [, '⬛', '🟫', '🟦', '🟪', '🟨'];

const handle = (message: GenericMessage, interaction?: string, interactionUserId?: string) => {
  const counts = interaction?.split(':')[1].split(',').map(Number) ?? [0, 0, 0, 0, 0];

  const numberResults = Array(10).fill(0).map(() => {
    const rand = Math.random();
    if (rand < 0.01) return 5;
    if (rand < 0.1) return 4;
    if (rand < 0.3) return 3;
    if (rand < 0.5) return 2;
    return 1;
  }).sort((a, b) => b - a);

  const symbolResult = numberResults.map(k => SYMBOLS[k]).join('');
  const newCounts = counts.map((k: any, i: any) => k + numberResults.filter(k => k === i + 1).length);
  const totalCount = newCounts.reduce((a: any, b: any) => a + b, 0);
  const totalGolds = newCounts[4];
  const tierIndex = Math.min(5, Math.max(0, Math.round(totalGolds / totalCount / 0.01 + 1))) || 1;

  const stats = [
    `总计抽数：${totalCount}`,
    `总计出金：${totalGolds}`,
    `运气指数：${Array(tierIndex).fill(0).map(() => '⭐️').join('')}`,
  ].join('\n');

  if (!interaction) {
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: `${symbolResult}\n\n${stats}`,
      interactions: [{
        command: `chou:${newCounts.join(',')}`,
        icon: '🔁',
        description: '再抽一次',
      }],
      messageIdReplied: message.messageId,
      rawMessageExtra: {
        disable_notification: true,
      },
    });
    return;
  }
  if (message.userIdReplied && interactionUserId !== message.userIdReplied) {
    return;
  }
  defaultClientSet.editBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    messageId: message.messageId,
    text: `${symbolResult}\n\n${stats}`,
    interactions: [{
      command: `chou:${newCounts.join(',')}`,
      icon: '🔁',
      description: '再抽一次',
    }],
  });
};

export {
  handle as handleSlashCommand,
  handle as handleInteraction,
};
