import { Collection as MongoCollection } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { getDb } from "../utils/mongo";
import { embeddings } from "../utils/openai";
import { env } from "../utils/env";

let collectionPromise: Promise<MongoCollection> | null = null;
let vectorStorePromise: Promise<MongoDBAtlasVectorSearch> | null = null;

export const getKbCollection = async (): Promise<MongoCollection> => {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getDb();
      return db.collection(env.KB_COLLECTION_NAME);
    })();
  }

  return collectionPromise;
};

export const getVectorStore = async (): Promise<MongoDBAtlasVectorSearch> => {
  if (!vectorStorePromise) {
    vectorStorePromise = (async () => {
      const collection = await getKbCollection();

      return new MongoDBAtlasVectorSearch(embeddings, {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        collection,
        indexName: env.KB_VECTOR_SEARCH_INDEX,
        textKey: "text",
        embeddingKey: "embedding",
      });
    })();
  }

  return vectorStorePromise;
};
