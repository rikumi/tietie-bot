import { isAutodelEnabled } from 'src/database/autodel';
import { User } from 'telegraf/typings/core/types/typegram';
import { IBot, ICommonMessageContext, IContext } from 'typings';

const msgOptions = {
  parse_mode: 'MarkdownV2',
  disable_web_page_preview: true,
} as const;

export const handleSlashCommand = async (ctx: ICommonMessageContext, bot: IBot) => {
  const { message } = ctx;
  const content = message.text!.trim().replace(/^.*?\s+/, '');
  if (!content) return;
  const escape = (text: string) => text.replace(/([\u0000-\u007f])/g, '\\$1');
  const formatUser = (user: User, customName?: string) => {
    return `[${escape(customName || `${user.first_name} ${user.last_name || ''}`.trim())}](tg://user?id=${user.id})`;
  }
  const shouldAutodel = await isAutodelEnabled(String(message.from.id));
  if (shouldAutodel) {
    bot.telegram.deleteMessage(message.chat.id, message.message_id).catch();
  }
  await (ctx as IContext).reply(`${formatUser(message.from)} ${escape(content)}！`, {
    ...msgOptions,
    reply_to_message_id: shouldAutodel ? undefined : message.message_id,
    disable_notification: true,
  });
};
