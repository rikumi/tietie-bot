import { GenericMessage } from 'src/clients/base';
import telegramBotClient from 'src/clients/telegram';

export const USAGE = `[newTag] 查看或更改辑被回复群成员的头衔`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const newTag = message.text.trim().split(/\s+/)[1];
  const userId = message.userIdReplied || message.userId;
  const isSelf = userId === message.userId;
  const userName = message.userIdReplied ? message.userNameReplied : message.userDisplayName;

  const { telegram } = telegramBotClient.bot;
  if (newTag) {
    if (message.clientName !== 'telegram') {
      return '只有 telegram 用户可以查看和设置头衔。';
    }
    if (!isSelf) {
      const admins = await telegram.getChatAdministrators(message.chatId);
      if (!admins.some((admin) => String(admin.user.id) === message.userId)) {
        return '只有管理员可以更改别人的头衔。';
      }
    }
    try {
      await telegram.callApi('setChatMemberTag' as any, { chat_id: message.chatId, user_id: userId, tag: newTag });
      return;
    } catch (e) {
      return '更改头衔失败，请检查参数';
    }
  }
  const { tag } = (await telegram.getChatMember(message.chatId, Number(userId))) as any;
  if (!tag) {
    return `${isSelf ? '你' : `${userName} `}目前没有头衔。`
  }
  return `${isSelf ? '你' : `${userName} `}目前的头衔是 ${tag}。`
};
