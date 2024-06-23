import { setTietieEnabled, isTietieEnabled } from '../database/tietie';
import { isAutodelEnabled } from 'src/database/autodel';
import { GenericMessage, GenericMessageEntity } from 'src/clients/base';
import defaultClientSet, { prependMessageText } from 'src/clients';
import telegram from 'src/clients/telegram';

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

const utf16Length = (str: string) => Buffer.from(str, 'utf16le').length / 2;

export const handleMessage = async (message: GenericMessage) => {
  const command = message.text!.trim().split(/\s+/)[0].replace(/^\//, '');

  // 默认行为 /贴贴，要求不能是全英文指令
  if (!/[^\u0000-\u00ff]/.test(command) || !await isTietieEnabled(message.clientName, message.chatId)) {
    return false;
  }

  const replied = message.messageReplied;
  const repliedFirstEntity = replied?.entities?.[0];
  const repliedMentionEntity = repliedFirstEntity?.offset === 0 && repliedFirstEntity.url ? repliedFirstEntity : undefined;

  const senderLink = message.userLink;
  const receiverLink = repliedMentionEntity ? repliedMentionEntity.url! : message.userLinkReplied ?? message.userLink!;

  const senderName = message.userName;
  const receiverName = receiverLink === senderLink
    ? '自己'
    : repliedMentionEntity
      ? replied?.text.slice(0, repliedMentionEntity.length)!
      : message.userNameReplied ?? '自己';

  const [action, ...rest] = message.text.slice(1).split(/\s+/);
  const suffix = rest.join(' ').trim();
  const result = { text: '', entities: [] as GenericMessageEntity[] };

  prependMessageText(result, `${receiverName} ${suffix}！`);
  result.entities.unshift({ type: 'link', offset: 0, length: utf16Length(receiverName), url: receiverLink });

  prependMessageText(result, `${senderName} ${action}${suffix || action.includes('了') ? '' : '了'} `);
  result.entities.unshift({ type: 'link', offset: 0, length: utf16Length(senderName), url: senderLink });

  const shouldAutodel = await isAutodelEnabled(message.userId);
  if (shouldAutodel && message.clientName === 'telegram') {
    telegram.bot.telegram.deleteMessage(message.chatId, Number(message.messageId)).catch();
  }

  defaultClientSet.sendBotMessage({
    clientName: message.clientName,
    chatId: message.chatId,
    messageIdReplied: shouldAutodel ? undefined : message.messageId,
    ...result,
    rawMessageExtra: {
      disable_web_page_preview: true,
    },
  });
};
