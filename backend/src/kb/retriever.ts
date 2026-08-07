// question -> [Retriever] -> retrieve relevant chunks

import { Document } from "@langchain/core/documents";
import { DEFAULT_NAMESPACE } from "../utils/constants";
import { getVectorStore } from "./vectorStore";

export interface RetrieverResult {
  docs: Document[];
  confidence: number;
}

const emptyResult = (): RetrieverResult => ({ docs: [], confidence: 0 });

export const retrieveRelevantResults = async (
  query: string,
  namespace: string = DEFAULT_NAMESPACE,
  k: number = 2,
): Promise<RetrieverResult> => {
  if (!query?.trim()) return emptyResult();

  const vectorStore = await getVectorStore();

  const embeddedQuery = await vectorStore?.embeddings?.embedQuery(query);

  const relevantChunkPairs = await vectorStore.similaritySearchVectorWithScore(embeddedQuery, k, { namespace });

  if (!relevantChunkPairs?.length) return emptyResult();

  const docs = relevantChunkPairs.map(([doc]) => doc);

  const scores = relevantChunkPairs.map(([_, score]) => Number(score) || 0);
  const bestScore = Math.max(...scores);
  const normalizedScore = Math.max(0, Math.min(1, bestScore));
  const confidence = Number(normalizedScore.toFixed(2));

  return { docs, confidence };
};
