export interface GenericMessage {
  clientName: string;
  text: string;
  userId: string;
  userHandle?: string;
  userDisplayName?: string;
  userLink?: string;
  chatId: string;
  messageId: string;
  mediaMessageId?: string;
  unixDate?: number;

  media?: GenericMedia;
  entities?: GenericMessageEntity[];
  messageReplied?: GenericMessage;

  isServiceMessage?: boolean;
  messageIdReplied?: string;
  userIdReplied?: string;
  userNameReplied?: string;
  userLinkReplied?: string;
  disableBridging?: boolean;

  platformMessage?: any;
  bridgedMessage?: GenericMessage;
}

export interface GenericMedia {
  type: 'sticker' | 'photo' | 'video' | 'file';
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  telegramFileId?: string;
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

  sendMessage(message: MessageToSend): Promise<GenericMessage>;
  editMessage(message: MessageToEdit): Promise<void>;

  reactToMessage?(chatId: string, messageId: string, emoji: string, reactorDisplayName: string): Promise<void>;
  callOtherBotCommand?(text: string, chatId: string): Promise<void>;
  setCommandList?(commandList: { command: string; description: string }[]): Promise<void>;
}

export interface MessageToSend {
  clientName: string;
  text: string;
  chatId: string;
  media?: GenericMedia;
  messageIdReplied?: string;
  platformMessageExtra?: any;
  bridgedMessage?: GenericMessage;
  entities?: GenericMessageEntity[];
}

export interface MessageToEdit extends MessageToSend {
  messageId: string;
  mediaMessageId?: string;
  isServiceMessage?: boolean;
  userId?: string;
  userHandle?: string;
  userDisplayName?: string;
}
