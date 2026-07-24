import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const DEFAULT_CHUNK_SIZE = 800;
const DEFAULT_CHUNK_OVERLAP_SIZE = 150;

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: DEFAULT_CHUNK_SIZE, chunkOverlap: DEFAULT_CHUNK_OVERLAP_SIZE });

export const splitDocuments = async (docs: Document[]): Promise<Document[]> => {
  if (!docs?.length) return [];

  const chunks = await splitter.splitDocuments(docs);

  return chunks.map((chunk, index) => {
    const baseMetadata: Record<string, unknown> = chunk?.metadata ?? {};

    return new Document({
      pageContent: chunk?.pageContent.trim(),
      metadata: {
        ...baseMetadata,
        source: baseMetadata?.source ?? "unknown source",
        _chunkIndex: index,
      },
    });
  });
};
