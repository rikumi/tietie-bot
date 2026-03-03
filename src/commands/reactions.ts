import defaultClientSet from 'src/clients';
import { GenericMessage } from 'src/clients/base';

export const USAGE = `显示被引用的消息的所有表情回应`;

export const handleSlashCommand = async (message: GenericMessage | undefined) => {
  if (!message?.messageReplied) {
    return '回复给其它消息以查看表情回应';
  }
  const allReactions = await defaultClientSet.getAllReactionsForMessage(message.messageReplied);
  if (!allReactions.length) {
    return '该消息暂无回应';
  }
  const descriptions = allReactions.map((r) => `[${r.clientName}] ${r.userDisplayName ?? r.userId} 回应了 ${r.reaction} ${r.customReactionUrl ?? ''}`.trim());
  return `该消息的所有回应：\n\n${descriptions.join('\n')}`.trim();
};
