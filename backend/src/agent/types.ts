export type ChatRole = "assistant" | "user";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  ts?: Date;
}

export interface RetrievedContext {
  source: string;
  chunkId: number;
  // text goes to the model, preview goes to the client inside citations
  text: string;
  preview: string;
}

export interface SubQuestion {
  id: string;
  question: string;
  // the same question rewritten as a vector search query
  query: string;
}

export interface Finding {
  question: string;
  contexts: RetrievedContext[];
}

export interface Citation {
  source: string;
  chunkId: number;
  preview: string;
}

export interface Draft {
  answer: string;
  citations: Citation[];
}

export type AgentResult
  = | { blocked: false; answer: string; citations: Citation[]; plan: SubQuestion[] }
    | { blocked: true };
