import { Collection as MongoCollection } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { getDb } from "../urils/mongo";
import { embeddings } from "../urils/openai";

const KB_COLLECTION_NAME = "kb_chunks";
const KB_INDEX_NAME = "kb_vector_index";

let collectionPromise: Promise<MongoCollection> | null = null;
let vectorStorePromise: Promise<MongoDBAtlasVectorSearch> | null = null;

export const getKbCollection = async (): Promise<MongoCollection> => {
  if (!collectionPromise) {
    collectionPromise = (async () => {
      const db = await getDb();
      return db.collection(KB_COLLECTION_NAME);
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
        indexName: KB_INDEX_NAME,
        textKey: "text",
        embeddingKey: "embedding",
      });
    })();
  }

  return vectorStorePromise;
};
