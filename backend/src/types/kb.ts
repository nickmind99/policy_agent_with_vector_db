export interface KBChunk {
  namespace: string;
  source: string;
  chunkId: number;
  text: string;
  // for vector search
  // 1536
  embedding: number[];
}
