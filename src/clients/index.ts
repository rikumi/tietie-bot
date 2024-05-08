import { getBridgeNickname, getBridgedMessageId, getUnidirectionalBridgesByChat, recordBridgedMessage } from 'src/database/bridge';
import type { GenericClient, GenericMessage, MessageToSend } from './base';
import { EventEmitter } from 'events';

export class DefaultClientSet extends EventEmitter {
  public readonly clients = new Map<string, GenericClient>();
  public static readonly CLIENT_NAMES = ['telegram', 'discord', 'matrix'] as const;

  public async start() {
    for (const clientName of DefaultClientSet.CLIENT_NAMES) {
      await this.registerAndStartClient(clientName);
    }
  }

  public async stop() {
    for (const clientName of DefaultClientSet.CLIENT_NAMES) {
      await this.stopAndUnregisterClient(clientName);
    }
  }

  public async bridgeMessage(fromMessage: GenericMessage): Promise<GenericMessage[]> {
    const bridges = await getUnidirectionalBridgesByChat(fromMessage.clientName, fromMessage.chatId);
    const hasCommand = /^\/\w+\b/.test(fromMessage.text);
    const results = await Promise.all(bridges.map(async ({ toClient: toClientName, toChatId }) => {
      const toClient = this.clients.get(toClientName);
      if (!toClient) return;
      const userNick = (await getBridgeNickname(fromMessage.clientName, fromMessage.chatId, fromMessage.userId)) || fromMessage.userName;
      const toMessageText = fromMessage.isServiceMessage ? fromMessage.text : `${userNick}: ${fromMessage.text}`;
      const toMessageIdReplied = fromMessage.messageIdReplied
        ? await getBridgedMessageId(fromMessage.clientName, fromMessage.messageIdReplied, toClientName)
        : undefined;

      const toMessage = await toClient.sendMessage({
        clientName: toClientName,
        text: toMessageText,
        chatId: toChatId,
        mediaType: fromMessage.mediaType,
        mediaUrl: fromMessage.mediaUrl,
        messageIdReplied: toMessageIdReplied,
      });
      recordBridgedMessage(fromMessage.clientName, fromMessage.messageId, toClientName, toMessage.messageId);
      if (hasCommand) {
        toClient.tryExecuteCommand?.(fromMessage.text, toChatId);
      }
      return toMessage;
    }));
    return results.filter(Boolean) as GenericMessage[];
  }

  public async bridgeEditedMessage(fromMessage: GenericMessage): Promise<void> {
    const bridges = await getUnidirectionalBridgesByChat(fromMessage.clientName, fromMessage.chatId);
    await Promise.all(bridges.map(async ({ toClient: toClientName, toChatId }) => {
      const toClient = this.clients.get(toClientName);
      if (!toClient) return;
      const userNick = (await getBridgeNickname(fromMessage.clientName, fromMessage.chatId, fromMessage.userId)) || fromMessage.userName;
      toClient.editMessage({
        clientName: toClientName,
        chatId: toChatId,
        messageId: await getBridgedMessageId(fromMessage.clientName, fromMessage.messageId, toClientName),
        text: fromMessage.isServiceMessage ? fromMessage.text : `${userNick}: ${fromMessage.text}`,
      });
    }));
  }

  public async sendBotMessage(message: MessageToSend) {
    const client = this.clients.get(message.clientName);
    console.log('[DefaultClientSet] sendBotMessage:', message.clientName, message);
    if (!client) return;
    const messageSent = await client.sendMessage(message);
    const messagesBridged = await this.bridgeMessage({ ...messageSent, isServiceMessage: true });
    const messages = [messageSent, ...messagesBridged];
    const editAll = (patch: Partial<MessageToSend>) => Promise.all(messages.map(async (message) => {
      await defaultClientSet.clients.get(message!.clientName)!.editMessage({ ...message, ...patch });
    }));
    return { messages, editAll };
  }

  public async setCommandList(commandList: { command: string; description: string }[]) {
    await Promise.all(Array.from(this.clients.values()).map(async (client) => {
      return await client.setCommandList?.(commandList);
    }));
  }

  private async registerAndStartClient(clientName: string) {
    try {
      const client: GenericClient = (await import('./' + clientName)).default;
      client.on('message', (message, rawContext) => {
        console.log('[DefaultClientSet] received message:', clientName, message);
        this.emit('message', message, rawContext);
      });
      client.on('edit-message', (message) => {
        console.log('[DefaultClientSet] received edit-message:', clientName, message);
        this.emit('edit-message', message);
      });
      this.clients.set(clientName, client);
      await client.start();
      console.log('[DefaultClientSet] Client started:', clientName);
    } catch (e) {
      console.warn('[DefaultClientSet] Failed to initialize bot', clientName, e);
    }
  }

  private async stopAndUnregisterClient(clientName: string) {
    const client = this.clients.get(clientName);
    if (!client) {
      return;
    }
    await client.stop();
  }
}

const defaultClientSet = new DefaultClientSet();
export default defaultClientSet;
