import { EventEmitter } from 'events';

import { GenericClient, GenericMessage, MessageToEdit, MessageToSend } from './base';
import config from '../../config.json';

export class WeComBotClient extends EventEmitter implements GenericClient {
  public async start(): Promise<void> {

  }

  public async stop(): Promise<void> {

  }

  public async sendMessage(message: MessageToSend): Promise<GenericMessage> {
    return message as any;
  }

  public async editMessage(message: MessageToEdit): Promise<void> {

  }
}

export default config.wecom.enable !== false ? new WeComBotClient() : null;
