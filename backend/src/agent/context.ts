import { Document } from "@langchain/core/documents";
import { ChatMessage, Finding, RetrievedContext } from "./types";

const PREVIEW_LENGTH = 400;
const HISTORY_TURNS = 10;

export const toContexts = (docs: Document[]): RetrievedContext[] => docs.map((doc) => {
  const source = (doc?.metadata?.source as string) || "unknown source";
  const chunkId = Number(doc?.metadata?.chunkId ?? doc?.metadata?._chunkIndex ?? 0);
  const text = doc?.pageContent ?? "";
  const preview = text.length > PREVIEW_LENGTH ? text.slice(0, PREVIEW_LENGTH) + "..." : text;

  return { source, chunkId, text, preview };
});

export const formatHistory = (history: ChatMessage[]): string => history
  .slice(-HISTORY_TURNS)
  .map((message) => `${message.role}: ${message.content}`)
  .join("\n");

export const formatFindings = (findings: Finding[]): string => {
  const blocks = findings.map((finding) => {
    const contexts = finding.contexts.map((context) => `[source: ${context.source} | chunkId: ${context.chunkId}]\n${context.text}`);
    const body = contexts.length ? contexts.join("\n\n") : "NO CONTEXT FOUND";

    return `### ${finding.question}\n\n${body}`;
  });

  return blocks.join("\n\n=====\n\n");
};
