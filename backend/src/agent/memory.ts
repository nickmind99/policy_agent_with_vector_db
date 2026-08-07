import { Collection } from "mongodb";
import { nanoid } from "nanoid";
import { env } from "../utils/env";
import { getDb } from "../utils/mongo";
import { lazy } from "../utils/lazy";
import { ChatMessage } from "./types";

export interface ConversationDoc {
  threadId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const getConversationCollection = lazy<Collection<ConversationDoc>>(async () => {
  const db = await getDb();
  const collection = db.collection<ConversationDoc>(env.CONVERSATIONS_COLLECTION_NAME);

  await collection.createIndex({ threadId: 1 }, { unique: true });

  return collection;
});

export const ensureThreadId = async (threadId?: string): Promise<string> => {
  const collection = await getConversationCollection();

  if (threadId) {
    const existing = await collection.findOne({ threadId });

    if (existing) return existing.threadId;
  }

  const newThreadId = nanoid(12);
  const now = new Date();

  await collection.insertOne({ threadId: newThreadId, messages: [], createdAt: now, updatedAt: now });

  return newThreadId;
};

export const getConversation = async (threadId: string): Promise<ChatMessage[]> => {
  const collection = await getConversationCollection();
  const conversation = await collection.findOne({ threadId });

  if (!conversation) return [];

  return conversation.messages.map((message) => ({
    role: message.role,
    content: message.content,
    ts: message?.ts,
  }));
};

export const appendToHistory = async (threadId: string, ...messages: ChatMessage[]): Promise<void> => {
  if (!messages.length) return;

  const collection = await getConversationCollection();

  const messagesWithTs = messages.map((message) => ({
    role: message.role,
    content: message.content,
    ts: message?.ts ?? new Date(),
  }));

  await collection.updateOne({ threadId }, {
    $push: {
      messages: {
        $each: messagesWithTs,
      },
    },
    $set: {
      updatedAt: new Date(),
    },
  });
};
