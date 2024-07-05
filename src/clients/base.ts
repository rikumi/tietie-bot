export interface GenericMessage {
  clientName: string;
  text: string;
  userId: string;
  userName: string;
  userLink?: string;
  chatId: string;
  messageId: string;
  mediaMessageId?: string;
  unixDate: number;

  media?: GenericMedia;
  entities?: GenericMessageEntity[];
  messageReplied?: GenericMessage;

  isServiceMessage?: boolean;
  messageIdReplied?: string;
  userIdReplied?: string;
  userNameReplied?: string;
  userLinkReplied?: string;

  rawMessage: any;
}

export interface GenericMedia {
  type: 'sticker' | 'photo' | 'video' | 'file';
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

export interface GenericMessageEntity {
  type: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'code' | 'pre' | 'mention' | 'blockquote' | 'link';
  offset: number;
  length: number;
  url?: string;
  codeLanguage?: string;
}

export interface GenericClient<T = any, U = any, V = {}> {
  start(): Promise<void>;
  stop(): Promise<void>;

  on(eventName: 'message', handler: (message: GenericMessage) => void): void;
  on(eventName: 'edit-message', handler: (message: GenericMessage) => void): void;

  sendMessage(message: MessageToSend): Promise<GenericMessage | null>;
  editMessage(message: MessageToEdit): Promise<void>;

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
  entities?: GenericMessageEntity[];
}

export interface MessageToEdit extends MessageToSend {
  messageId: string;
  mediaMessageId?: string;
  isServiceMessage?: boolean;
  userId?: string;
  userName?: string;
  entities?: GenericMessageEntity[];
}
