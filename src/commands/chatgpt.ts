import { ask } from '../modules/chatgpt';
import { getChatGPTSystemMessage } from '../database/chatgpt';
import { ICommonMessageContext, IContext } from 'typings';

const defaultSystemMessage = '你是贴贴 Bot，一个 Telegram 聊天机器人。你的每次回答尽量简短，不能超过 200 字。'

export const handleSlashCommand = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  const chatId = String(ctx.message.chat.id);
  const question = message.text!.trim().replace(/^.*?(\s+|$)/, '');
  if (!question) return;
  const replyMessage = await (ctx as IContext).reply('…', { reply_to_message_id: message.message_id });

  const editMessage = async (text: string): Promise<void> => {
    try {
      ctx.telegram.editMessageText(chatId, replyMessage.message_id, undefined, text);
    } catch (e: any) {
      if (e.message && e.message.includes('Too Many Requests')) {
        await new Promise(r => setTimeout(r, 1000));
        return editMessage(text);
      };
      throw e;
    }
  };

  try {
    let lastAnswer = '';
    const systemMessage = await getChatGPTSystemMessage(chatId) || defaultSystemMessage;
    for await (const answer of ask(question, systemMessage, 'gpt-4')) {
      if (!answer) continue;
      await Promise.all([
        editMessage(answer + '…'),
        new Promise(r => setTimeout(r, 1000)),
      ]);
      lastAnswer = answer;
    }
    await editMessage(lastAnswer);
  } catch (e: any) {
    console.error(e);
    editMessage('请求失败了，可能是接口被限频或者 token 失效，请过一会再问我这个问题。\n' + e.message);
  }
};
