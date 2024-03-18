import { IBot, ICommonMessageContext, IContext, IMaybeTextMessage } from 'typings';
import { setTietieEnabled, isTietieEnabled } from '../database/tietie';
import { MessageEntity, User } from 'telegraf/typings/core/types/typegram';

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const chatId = String(ctx.message.chat.id);
  const str = ctx.message.text!.split(/\s+/)[1];
  if (!['on', 'off'].includes(str)) {
    return '用法: /tietie <on|off>';
  }
  if (str === 'on') {
    await setTietieEnabled(chatId, true);
    return '已为当前会话开启贴贴功能。';
  } else {
    await setTietieEnabled(chatId, false);
    return '已为当前会话关闭贴贴功能。';
  }
};

export const handleMessage = async (ctx: ICommonMessageContext, bot: IBot) => {
  const { message } = ctx;
  const chatId = String(ctx.message.chat.id);
  const command = message.text!.trim().split(/\s+/)[0].replace(/^\//, '');

  // 默认行为 /贴贴，要求不能是全英文指令
  if (!/[^\u0000-\u00ff]/.test(command) || !await isTietieEnabled(chatId)) {
    return false;
  }
  const escape = (text: string) => text.replace(/([\u0000-\u007f])/g, '\\$1');
  const formatUser = (user: User, customName?: string) => {
    return `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  };

  const replied = message.reply_to_message;
  const repliedBotMsg: IMaybeTextMessage | undefined = replied?.from?.username === bot.botInfo!.username ? replied : undefined;
  const lastMentionEntity: MessageEntity.TextMentionMessageEntity | undefined = repliedBotMsg?.entities?.filter((k) => k.type === 'text_mention')[0] as any;
  const lastMentionUser = lastMentionEntity?.user;

  const sender = message.from;
  const receiver = lastMentionUser ?? replied?.from ?? sender;

  const senderLink = formatUser(sender);
  const receiverLink = formatUser(receiver, receiver.id === sender.id ? '自己' : undefined);
  const [action, ...rest] = message.text!.slice(1).split(/\s+/).map(escape);
  const postfix = rest.join(' ').trim();
  const result = `${senderLink} ${action}${postfix || action.includes('了') ? '' : '了'} ${receiverLink} ${postfix}`.trim() + '！';

  (ctx as IContext).reply(result, {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    reply_to_message_id: message.message_id,
    disable_notification: true,
  });
};
