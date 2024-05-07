export interface MessageToSend {
  clientName: string;
  text: string;
  chatId: string;

  mediaType?: 'photo' | 'video' | 'file';
  mediaUrl?: string;
  messageIdReplied?: string;

  rawMessageExtra?: any;
}

export interface GenericMessage<T = any, U = any> {
  clientName: string;
  text: string;
  userId: string;
  userName: string;
  chatId: string;
  messageId: string;
  unixDate: number;

  isServiceMessage?: boolean;
  mediaType?: 'photo' | 'video' | 'file';
  mediaUrl?: string;
  messageIdReplied?: string;

  rawMessage: T;
  rawUser: U;
  rawMessageReplied?: T;
}

export interface GenericClient<T = any, U = any, V = {}> {
  start(): Promise<void>;
  stop(): Promise<void>;

  on(eventName: 'message', handler: (message: GenericMessage<T, U>, rawContext?: any) => void): void;
  on(eventName: 'edit-message', handler: (message: GenericMessage<T, U>) => void): void;
  on(eventName: 'custom-action', handler: (action: any) => void): void;

  sendMessage(message: MessageToSend): Promise<GenericMessage<T, U>>;
  editMessage(message: GenericMessage<T, U>): Promise<void>;
  tryExecuteCommand?(text: string, chatId: string): Promise<void>;
}
