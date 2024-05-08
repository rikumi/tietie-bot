import fs from 'fs';
import path from 'path';

import * as alias from './commands/alias';
import * as repeat from './commands/repeat';
import * as search from './commands/search';
import * as video from './commands/set_video';
import * as tietie from './commands/tietie';

import clients from './clients';
import { GenericMessage } from './clients/base';
import defaultClientSet from './clients';
import { startServer } from './server';

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const handleMessage = async (message: GenericMessage, rawContext: any) => {
  search.handleMessage(message);
  clients.bridgeMessage(message);

  // 各种非 slash commands
  if (!message.text.startsWith('/')) {
    if (await repeat.handleGeneralMessage(message) !== false) return;
    return;
  }
  // 调用 slash commands
  await alias.handleMessage(message);
  if (await video.handleMessage(message) !== false) return;
  if (await tietie.handleMessage(message) !== false) return;

  const action = message.text.trim().split(' ')[0].substring(1);
  const moduleName = path.resolve(__dirname, `./commands/${action}.ts`);
  console.log('[CommandHandler] Resolving module:', moduleName);

  if (!/^\w+$/.test(action) || !fs.existsSync(moduleName)) {
    return;
  }
  try {
    const module = await import(moduleName);
    const result = await module.handleSlashCommand?.(message, rawContext);
    if (result) defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: result,
      messageIdReplied: message.messageId,
    });
  } catch (e: any) {
    console.error(e);
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: 'Error: ' + e.message,
      messageIdReplied: message.messageId,
    });
  }
};

const handleEditedMessage = async (message: GenericMessage) => {
  search.handleEditedMessage(message);
};

const handleCustomAction = async (rawContext: any) => {
  const moduleName = rawContext.callbackQuery!.data!.split(':')[0];
  const module = `./commands/${moduleName}.ts`;
  try {
    const result = await (await import(module)).handleCustomAction?.(rawContext);
    if (result) rawContext.reply(result);
  } catch (e) {
    console.error(e);
  }
};

(async () => {
  await clients.start();
  clients.on('message', handleMessage);
  clients.on('edit-message', handleEditedMessage);
  clients.on('custom-action', handleCustomAction);
  startServer();
})();
