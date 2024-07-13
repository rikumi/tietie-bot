import { GenericMessage } from 'src/clients/base';
import defaultClientSet from 'src/clients';
import { unsafeUpdateBot } from 'src/utils/update';

export const USAGE = `更新代码并重启 (管理员使用)`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const branch = message.text?.split(/\s+/)[1];
  const [messageSent] = (await defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text: '代码更新执行中',
    messageIdReplied: message.messageId,
  }))!;

  await unsafeUpdateBot(branch, async (pullResult) => {
    await defaultClientSet.editBotMessage({ ...messageSent, text: pullResult });
  }, async (pullResult, switchBranchResult) => {
    await defaultClientSet.editBotMessage({ ...messageSent, text: `${pullResult}\n\n${switchBranchResult}` });
  });
};
