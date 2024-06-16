import { getBridgeNickname, getUnidirectionalBridgesByChat } from 'src/database/bridge';
import type { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';
import { EventEmitter } from 'events';

export class DefaultClientSet extends EventEmitter {
  public readonly clients = new Map<string, GenericClient>();
  private recentBridgedMessages = new Map<string, [string, string | undefined]>();
  public static readonly CLIENT_NAMES = ['telegram', 'discord', 'matrix'] as const;

  public async start() {
    for (const clientName of DefaultClientSet.CLIENT_NAMES) {
      await this.registerAndStartClient(clientName);
    }
  }

  public async bridgeMessage(fromMessage: GenericMessage): Promise<GenericMessage[]> {
    const bridges = await getUnidirectionalBridgesByChat(fromMessage.clientName, fromMessage.chatId);
    const hasCommand = /^\/\w+\b/.test(fromMessage.text);
    const results = await Promise.all(bridges.map(async ({ toClient: toClientName, toChatId }) => {
      const toClient = this.clients.get(toClientName);
      if (!toClient) return;
      const userNick = (await getBridgeNickname(fromMessage.clientName, fromMessage.chatId, fromMessage.userId)) || fromMessage.userName;
      const fromMessageText = fromMessage.text;
      const toMessageText = fromMessage.isServiceMessage ? fromMessageText : `${userNick}: ${fromMessageText}`;
      const toMessageIdReplied = fromMessage.messageIdReplied
        ? this.convertRecentMessageId(fromMessage.clientName, fromMessage.chatId, fromMessage.messageIdReplied, toClientName, toChatId)?.[0]
        : undefined;

      const toMessage = await toClient.sendMessage({
        clientName: toClientName,
        text: toMessageText,
        chatId: toChatId,
        media: fromMessage.media,
        messageIdReplied: toMessageIdReplied,
        rawMessage: fromMessage.rawMessage,
      });
      // build bidirectional message id mapping
      this.recordRecentMessageId(fromMessage.clientName, fromMessage.chatId, fromMessage.messageId, toClientName, toChatId, toMessage.messageId, toMessage.mediaMessageId);
      this.recordRecentMessageId(toClientName, toChatId, toMessage.messageId, fromMessage.clientName, fromMessage.chatId, fromMessage.messageId, undefined);
      if (toMessage.mediaMessageId) {
        this.recordRecentMessageId(toClientName, toChatId, toMessage.mediaMessageId, fromMessage.clientName, fromMessage.chatId, fromMessage.messageId, undefined);
      }
      if (hasCommand) {
        toClient.callOtherBotCommand?.(fromMessage.text, toChatId);
      }
      return toMessage;
    }));
    return results.filter(Boolean) as GenericMessage[];
  }

  public async bridgeEditedMessage(fromMessage: MessageToEdit): Promise<void> {
    const bridges = await getUnidirectionalBridgesByChat(fromMessage.clientName, fromMessage.chatId);
    await Promise.all(bridges.map(async ({ toClient: toClientName, toChatId }) => {
      const toClient = this.clients.get(toClientName);
      if (!toClient) return;
      const userNick = fromMessage.userId && (await getBridgeNickname(fromMessage.clientName, fromMessage.chatId, fromMessage.userId)) || fromMessage.userName;
      const messageIdsToEdit = this.convertRecentMessageId(fromMessage.clientName, fromMessage.chatId, fromMessage.messageId, toClientName, toChatId);
      if (!messageIdsToEdit) return;
      const [messageIdToEdit, mediaMessageIdToEdit] = messageIdsToEdit;
      toClient.editMessage({
        clientName: toClientName,
        chatId: toChatId,
        messageId: messageIdToEdit,
        mediaMessageId: mediaMessageIdToEdit,
        text: fromMessage.isServiceMessage ? fromMessage.text : `${userNick}: ${fromMessage.text}`,
        media: fromMessage.media,
      });
    }));
  }

  public async sendBotMessage(message: MessageToSend) {
    const client = this.clients.get(message.clientName);
    if (!client) return;
    const messageSent = await client.sendMessage(message);
    const messagesBridged = await this.bridgeMessage({ ...messageSent, isServiceMessage: true });
    return [messageSent, ...messagesBridged];
  }

  public async editBotMessage(message: MessageToEdit) {
    const client = this.clients.get(message.clientName);
    if (!client) return;
    await client.editMessage(message);
    await this.bridgeEditedMessage({ ...message, isServiceMessage: true });
  }

  public async setCommandList(commandList: { command: string; description: string }[]) {
    await Promise.all(Array.from(this.clients.values()).map(async (client) => {
      return await client.setCommandList?.(commandList);
    }));
  }

  private async registerAndStartClient(clientName: string) {
    try {
      const client: GenericClient = (await import('./' + clientName)).default;
      client.on('message', (message) => {
        this.emit('message', message);
      });
      client.on('edit-message', (message) => {
        this.emit('edit-message', message);
      });
      this.clients.set(clientName, client);
      await client.start();
    } catch (e) {
      console.warn('[DefaultClientSet] Failed to initialize bot', clientName, e);
    }
  }

  private recordRecentMessageId(remoteClientName: string, remoteChatId: string, remoteMessageId: string, localClientName: string, localChatId: string, localMessageId: string, localMediaMessageId?: string) {
    const key = `${remoteClientName}|${remoteChatId}|${remoteMessageId}|${localClientName}|${localChatId}`;
    this.recentBridgedMessages.set(key, [localMessageId, localMediaMessageId]);
  }

  private convertRecentMessageId(remoteClientName: string, remoteChatId: string, remoteMessageId: string, localClientName: string, localChatId: string): [string, string | undefined] | undefined {
    const key = `${remoteClientName}|${remoteChatId}|${remoteMessageId}|${localClientName}|${localChatId}`;
    const bridgedMessageIds = this.recentBridgedMessages.get(key);
    if (!bridgedMessageIds) return;
    return bridgedMessageIds;
  }
}

const defaultClientSet = new DefaultClientSet();
export default defaultClientSet;
