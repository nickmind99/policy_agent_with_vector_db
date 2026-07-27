import { z } from "zod";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import { ingestDocuments } from "../src/kb/ingest";
import { retrieveRelevantResults } from "../src/kb/retriever";
import { getKbCollection } from "../src/kb/vectorStore";
import { env } from "../src/utils/env";
import { getDb } from "../src/utils/mongo";

export const NAMESPACE = "__eval__";

const DOCS = [
  new Document({
    metadata: { source: "pricing.md" },
    pageContent: "Free: 1 project, 500 API calls per day.\nPro: 29 USD per user per month, unlimited projects.",
  }),
  new Document({
    metadata: { source: "billing.md" },
    pageContent: "Cancelling in the middle of a billing period gives no partial refund for the unused days. Pro features stay until the paid period ends.",
  }),
];

// one plan per document, with a distinct number on every line: a follow-up whose subject was
// resolved wrong then retrieves the wrong plan. A corpus small enough to be retrieved whole
// cannot fail a memory eval - the synthesizer sees every plan no matter what was asked
export const PLAN_DOCS = [
  new Document({
    metadata: { source: "plan-free.md" },
    pageContent: "Free plan: no charge. 1 project, 500 API calls per day, community support.",
  }),
  new Document({
    metadata: { source: "plan-pro.md" },
    pageContent: "Pro plan: 29 USD per user per month. 25 projects, 50000 API calls per day, email support.",
  }),
  new Document({
    metadata: { source: "plan-team.md" },
    pageContent: "Team plan: 49 USD per user per month. 100 projects, 200000 API calls per day, SSO and priority support.",
  }),
  new Document({
    metadata: { source: "billing.md" },
    pageContent: "Cancelling in the middle of a billing period gives no partial refund for the unused days. Paid features stay until the paid period ends.",
  }),
];

export const sourcesOf = (docs: Document[]): string[] => docs.map((doc) => doc.metadata.source as string);

export const SOURCES = sourcesOf(DOCS);

export const wipeKb = async (namespace: string = NAMESPACE) => (await getKbCollection()).deleteMany({ namespace });

// vitest and evalite run files in parallel, so a file that wipes its corpus on teardown must
// not share a namespace with a file that is still reading it
const ready = new Map<string, Promise<void>>();

export const seedKb = (namespace: string = NAMESPACE, docs: Document[] = DOCS): Promise<void> => {
  const pending = ready.get(namespace) ?? (async () => {
    await wipeKb(namespace);
    await ingestDocuments(namespace, docs);

    // Atlas indexes new vectors asynchronously, so the corpus is invisible for a few seconds
    while (!(await retrieveRelevantResults(docs[0].pageContent, namespace, 1)).docs.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  })();

  ready.set(namespace, pending);

  return pending;
};

export const wipeThread = async (threadId: string) => {
  const db = await getDb();

  await db.collection(env.CONVERSATIONS_COLLECTION_NAME).deleteOne({ threadId });
};

// not gpt-4o-mini: the graph already grades itself with it, and a judge that shares the
// generator's blind spots rubber-stamps its own hallucinations
const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0, openAIApiKey: env.OPENAI_API_KEY })
  .withStructuredOutput(z.object({ pass: z.boolean(), reason: z.string() }), { name: "verdict" });

export const judge = (system: string, human: string) => model.invoke([
  ["system", system],
  ["human", human],
]);

export const judgeAnswer = (expected: string, actual: string) => judge(
  "You grade a documentation Q&A agent. Set pass to true if the agent's answer conveys the facts of the reference answer and contradicts none of them.",
  `Reference answer:\n${expected}\n\nAgent answer:\n${actual}`,
);
