export interface GenericMessage<T = any, U = any> {
  clientName: string;
  text: string;
  userId: string;
  userName: string;
  chatId: string;
  messageId: string;
  mediaMessageId?: string;
  unixDate: number;

  media?: GenericMedia;

  isServiceMessage?: boolean;
  messageIdReplied?: string;
  userIdReplied?: string;

  rawMessage: T;
  rawUser: U;
  rawMessageReplied?: T;
}

export interface GenericMedia {
  type: 'sticker' | 'photo' | 'video' | 'file';
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface GenericClient<T = any, U = any, V = {}> {
  start(): Promise<void>;
  stop(): Promise<void>;

  on(eventName: 'message', handler: (message: GenericMessage<T, U>) => void): void;
  on(eventName: 'edit-message', handler: (message: GenericMessage<T, U>) => void): void;
  on(eventName: 'interaction', handler: (message: GenericMessage<T, U>, command: string, userId: string) => void): void;

  sendMessage(message: MessageToSend): Promise<GenericMessage<T, U>>;
  editMessage(message: MessageToEdit): Promise<void>;

  callOtherBotCommand?(text: string, chatId: string): Promise<void>;
  setCommandList?(commandList: { command: string; description: string }[]): Promise<void>;
}

export interface MessageToSend {
  clientName: string;
  text: string;
  chatId: string;
  media?: GenericMedia;
  messageIdReplied?: string;
  rawMessage?: any;
  rawMessageExtra?: any;
  interactions?: {
    command: string;
    icon: string;
    description: string;
  }[];
}

export interface MessageToEdit extends MessageToSend {
  messageId: string;
  mediaMessageId?: string;
  isServiceMessage?: boolean;
  userId?: string;
  userName?: string;
}
