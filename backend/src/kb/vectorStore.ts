import { Collection as MongoCollection } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { getDb } from "../utils/mongo";
import { embeddings } from "../utils/openai";
import { env } from "../utils/env";
import { lazy } from "../utils/lazy";

export const getKbCollection = lazy<MongoCollection>(async () => {
  const db = await getDb();

  return db.collection(env.KB_COLLECTION_NAME);
});

export const getVectorStore = lazy<MongoDBAtlasVectorSearch>(async () => {
  const collection = await getKbCollection();

  return new MongoDBAtlasVectorSearch(embeddings, {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    collection,
    indexName: env.KB_VECTOR_SEARCH_INDEX,
    textKey: "text",
    embeddingKey: "embedding",
  });
});
