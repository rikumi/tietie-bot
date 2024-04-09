import { Telegraf } from 'telegraf';
import config from '../config.json';
import fs from 'fs';
import path from 'path';

import * as alias from './commands/alias';
import * as discord from './commands/discord';
import * as repeat from './commands/repeat';
import * as search from './commands/search';
import * as video from './commands/set_video';
import * as tietie from './commands/tietie';

import type { IBot, ICallbackQueryContext, ICommonMessageContext, IContext, IEditedMessageContext } from 'typings';
import { startServer } from './server';

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

export const bot: IBot = new Telegraf(config.telegramBotToken);

const handleMessage = async (ctx: ICommonMessageContext) => {
  const { message } = ctx;
  if (!message) return;
  if (await discord.handleTelegramMessage(ctx, bot) !== false) return;

  // 下面只处理文字消息
  if (!message.text) {
    message.text = message.caption || '';
  }
  // 各种非 slash commands
  if (!message.text!.startsWith('/')) {
    search.recordChatMessage(ctx);
    if (await repeat.handleGeneralMessage(ctx) !== false) return;
    return;
  }
  // 调用 slash commands
  await alias.handleMessage(ctx);
  if (await video.handleMessage(ctx) !== false) return;
  if (await tietie.handleMessage(ctx, bot) !== false) return;

  const [action, botUsername] = message.text!.trim().split(' ')[0].slice(1).split('@');
  if (botUsername && bot.botInfo && botUsername !== bot.botInfo.username) {
    return;
  }
  const module = path.resolve(__dirname, `./commands/${action}.ts`);
  console.log('Resolving module:', module);
  if (!/^\w+$/.test(action) || !fs.existsSync(module)) {
    return;
  }
  try {
    const result = await (await import(module)).handleSlashCommand?.(ctx, bot);
    if (result) (ctx as IContext).reply(result, {
      reply_to_message_id: message.message_id,
    });
  } catch (e: any) {
    console.error(e);
    (ctx as IContext).reply('Error: ' + e.message, {
      reply_to_message_id: message.message_id,
    });
  }
};

const handleCallbackQuery = async (ctx: ICallbackQueryContext) => {
  const moduleName = ctx.callbackQuery!.data!.split(':')[0];
  const module = `./commands/${moduleName}.ts`;
  try {
    const result = await (await import(module)).handleCallbackQuery?.(ctx, bot);
    if (result) (ctx as IContext).reply(result);
  } catch (e) {
    console.error(e);
    // ctx.reply('Error: ' + e.message);
  }
};

bot.on('message', (ctx: IContext) => {
  if (!ctx.message || ctx.message.date * 1000 < Date.now() - 10000) return;
  handleMessage(ctx as any);
});

bot.on('callback_query', (ctx) => {
  handleCallbackQuery(ctx);
});

bot.on('edited_message', (ctx: IEditedMessageContext) => {
  search.handleEditedMessage(ctx);
});

bot.launch().then(async () => {
  await discord.init(bot);
  startServer();
  console.log('Service started!', bot.botInfo);
});
