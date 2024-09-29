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
import config from '../config.json';
import { notifyAllUpdateReceivers } from './utils/update';

process.on('uncaughtException', (e) => { console.error(e); });
process.on('unhandledRejection', (e) => { throw e; });

const commandMap = new Map<string, any>();

const handleMessage = async (message: GenericMessage) => {
  search.handleMessage(message);

  // filter out messages mentioning other bots
  if (/@(\w+bot)\b/.test(message.text)) {
    if (![config.botUsername, config.discordUsername, config.matrixUsername].includes(RegExp.$1)) {
      clients.bridgeMessage({ ...message });
      return;
    }
    message.text = message.text.replace(/@\w+bot\b/g, '');
  }
  // 各种非 slash commands
  if (!message.text.startsWith('/')) {
    clients.bridgeMessage({ ...message });
    await repeat.handleGeneralMessage(message);
    return;
  }
  // 调用 slash commands
  const module = commandMap.get(message.text.trim().split(' ')[0].substring(1));
  if (!module) {
    clients.bridgeMessage({ ...message });
    if (await video.handleMessage(message) !== false) return;
    if (await tietie.handleMessage(message) !== false) return;
    return await alias.handleMessage(message);
  };
  try {
    const result = await module.handleSlashCommand?.(message);
    clients.bridgeMessage({ ...message });

    if (result != null) defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: result,
      // messageIdReplied: message.messageId,
    });
  } catch (e: any) {
    console.error(e);
    defaultClientSet.sendBotMessage({
      clientName: message.clientName,
      chatId: message.chatId,
      text: 'Error: ' + e.message,
      // messageIdReplied: message.messageId,
    });
  }
};

const handleEditedMessage = async (message: GenericMessage) => {
  search.handleEditedMessage(message);
  clients.bridgeEditedMessage(message);
};

const handleInteraction = async (message: GenericMessage, command: string, userId: string) => {
  const module = commandMap.get(command.split(':')[0]);
  if (!module) return;
  await module.handleInteraction?.(message, command, userId);
};

(async () => {
  await clients.start();
  clients.on('message', handleMessage);
  clients.on('edit-message', handleEditedMessage);

  for (const fileName of fs.readdirSync(path.resolve(__dirname, 'commands'))) {
    if (fileName === __filename) continue;
    const commandName = fileName.replace(/\.ts$/, '');
    const filePath = path.resolve(__dirname, 'commands', fileName);
    commandMap.set(commandName, await import(filePath));
    console.log('[CommandHandlers] registered command:', commandName, filePath);
  }

  clients.setCommandList(
    Array.from(commandMap.entries())
      .filter(([, module]) => !!module.USAGE)
      .map(([command, module]) => ({ command, description: module.USAGE }))
  );

  startServer();
  notifyAllUpdateReceivers('tietie-bot 已成功重新启动');
})();
