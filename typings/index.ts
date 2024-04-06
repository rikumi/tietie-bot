import { Telegraf } from 'telegraf';
import type Context from 'telegraf/typings/context';
import type { CommonMessageBundle, Message, Update } from 'telegraf/typings/core/types/typegram';

/**
 * The bot should handle all message types.
 */
export type IContext<T extends Update = Update> = Context<T>;
export type IBot = Telegraf<IContext>;

/**
 * We only handle these types of messages for now.
 */
export type IMaybeTextMessage = Message.CommonMessage & Partial<Message.TextMessage>;
export type IMaybePhotoMessage = Message.CommonMessage & Partial<Message.PhotoMessage>;
export type IMaybeVideoMessage = Message.CommonMessage & Partial<Message.VideoMessage>;

export type IMessage = Message;
export type ICommonMessage =
  // It should be one of these types
  (Message.TextMessage | Message.PhotoMessage | Message.VideoMessage)
  // ...and for instance, it should have all the fields we need, at least being 'undefined'.
  & IMaybeTextMessage & IMaybePhotoMessage & IMaybeVideoMessage;

export type ICommonMessageContext = IContext<Update.MessageUpdate<ICommonMessage>>;
export type IAnyMessageContext = IContext<Update.MessageUpdate<any>>;

/**
 * Other types
 */
export type ICallbackQueryContext = IContext<Update.CallbackQueryUpdate>;
export type IEditedMessageContext = IContext<Update.EditedMessageUpdate<CommonMessageBundle>>;
