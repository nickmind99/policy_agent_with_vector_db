import { z } from "zod";
import { tool } from "langchain";
import { retrieveRelevantResults, RetrieverResult } from "../kb/retriever";

export type KnowledgeBaseRetriever = (
  query: string,
  namespace?: string,
  k?: number,
) => Promise<RetrieverResult>;

export const makeKnowledgeBaseSearchTool = (
  retrieve: KnowledgeBaseRetriever = retrieveRelevantResults,
) => tool(
  async ({ question, namespace }) => {
    const { docs, confidence } = await retrieve(question, namespace || "default");

    const contexts = docs.map((doc) => {
      const source = (doc?.metadata?.source as string) || "unknown source";
      const chunkId = (doc?.metadata?.chunkId as number) ?? (doc?.metadata?._chunkIndex as number) ?? 0;
      const preview = doc?.pageContent.length > 400 ? doc?.pageContent.slice(0, 400) + "..." : doc?.pageContent;

      return { source, chunkId, preview };
    });

    return {
      namespace,
      contexts,
      confidence,
    };
  }, {
    name: "kb_search",
    description: "Search the documentation KB for relevant answers",
    schema: z.object({
      question: z.string().describe("User question"),
      namespace: z.string().describe("KB namespace to query"),
    }),
  },
);

export const knowledgeBaseSearchTool = makeKnowledgeBaseSearchTool();
