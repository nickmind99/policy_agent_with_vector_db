import { Document } from "@langchain/core/documents";
import { getVectorStore } from "./vectorStore";

export interface IngestSummary {
  ok: boolean;
  namespace: string;
  totalChunks: number;
  sources: string[];
}

export const ingestDocuments = async (namespace: string, chunks: Document[]): Promise<IngestSummary> => {
  if (!namespace) throw new Error("namespace doesn't exist");

  if (!chunks) return {
    ok: false,
    namespace,
    totalChunks: 0,
    sources: [],
  };

  const vectorStore = await getVectorStore();

  // stable metadata for every document

  let currentChunkId = 0;

  const docsWithMeta = chunks.map((chunk) => {
    const source = (chunk?.metadata?.source as string) ?? "unknown source";

    return new Document({
      pageContent: chunk.pageContent,
      metadata: {
        namespace,
        source,
        chunkId: currentChunkId++,
      },
    });
  });

  await vectorStore.addDocuments(docsWithMeta);

  const sources = Array.from(new Set(docsWithMeta.map((doc) => doc.metadata.source)));

  return {
    ok: true,
    namespace,
    totalChunks: docsWithMeta?.length,
    sources,
  };
};
