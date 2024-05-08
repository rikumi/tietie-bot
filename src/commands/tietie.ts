import { setTietieEnabled, isTietieEnabled } from '../database/tietie';
import { MessageEntity, User } from 'telegraf/typings/core/types/typegram';
import { isAutodelEnabled } from 'src/database/autodel';
import { GenericMessage } from 'src/clients/base';
import telegram from 'src/clients/telegram';
import defaultClientSet from 'src/clients';

export const USAGE = `<on|off> 开启/关闭任意非 ASCII 指令贴贴功能`;

export const handleSlashCommand = async (message: GenericMessage) => {
  const str = message.text.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    return '用法: /tietie <on|off>';
  }
  if (str === 'on') {
    await setTietieEnabled(message.clientName, message.chatId, true);
    return '已为当前会话开启贴贴功能。';
  } else {
    await setTietieEnabled(message.clientName, message.chatId, false);
    return '已为当前会话关闭贴贴功能。';
  }
};

export const handleMessage = async (message: GenericMessage) => {
  const command = message.text!.trim().split(/\s+/)[0].replace(/^\//, '');

  // 默认行为 /贴贴，要求不能是全英文指令
  if (!/[^\u0000-\u00ff]/.test(command) || !await isTietieEnabled(message.clientName, message.chatId)) {
    return false;
  }
  const escape = (text: string) => text.replace(/([\u0000-\u007f])/g, '\\$1');
  const formatUser = (user: User, customName?: string) => {
    return `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  };

  // 这段暂时只支持 telegram 消息
  const replied = message.rawMessageReplied;
  const repliedBotMsg: any = replied?.from?.username === telegram.bot.botInfo!.username ? replied : undefined;
  const lastMentionEntity: MessageEntity.TextMentionMessageEntity | undefined = repliedBotMsg?.entities?.filter((k: any) => k.type === 'text_mention')[0] as any;
  const lastMentionUser = lastMentionEntity?.user;

  const sender = message.rawMessage.from;
  const receiver = lastMentionUser ?? replied?.from ?? sender;

  const senderLink = sender ? formatUser(sender) : message.userName;
  const receiverLink = receiver ? formatUser(receiver, receiver.id === sender.id ? '自己' : undefined) : '自己';
  const [action, ...rest] = message.text!.slice(1).split(/\s+/).map(escape);
  const postfix = rest.join(' ').trim();
  const result = `${senderLink} ${action}${postfix || action.includes('了') ? '' : '了'} ${receiverLink} ${postfix}`.trim() + '！';

  const shouldAutodel = await isAutodelEnabled(message.userId);
  if (shouldAutodel) {
    telegram.bot.telegram.deleteMessage(message.chatId, Number(message.messageId)).catch();
  }
  defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    text: result,
    messageIdReplied: shouldAutodel ? undefined : message.messageId,
    rawMessageExtra: {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      disable_notification: true,
    },
  });
};
