import { z } from "zod";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI } from "@langchain/openai";
import { ingestDocuments } from "../src/kb/ingest";
import { retrieveRelevantResults } from "../src/kb/retriever";
import { getKbCollection } from "../src/kb/vectorStore";
import { env } from "../src/utils/env";

export const NAMESPACE = "__eval__";

const PROBE = "Pro plan price per user";

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

export const SOURCES = DOCS.map((doc) => doc.metadata.source as string);

export const wipeKb = async () => (await getKbCollection()).deleteMany({ namespace: NAMESPACE });

let ready: Promise<void> | null = null;

export const seedKb = () => (ready ??= (async () => {
  await wipeKb();
  await ingestDocuments(NAMESPACE, DOCS);

  // Atlas indexes new vectors asynchronously, so the corpus is invisible for a few seconds
  while (!(await retrieveRelevantResults(PROBE, NAMESPACE, 1)).docs.length) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
})());

// not gpt-4o-mini: the graph already grades itself with it, and a judge that shares the
// generator's blind spots rubber-stamps its own hallucinations
const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0, openAIApiKey: env.OPENAI_API_KEY })
  .withStructuredOutput(z.object({ pass: z.boolean(), reason: z.string() }), { name: "verdict" });

export const judgeAnswer = (expected: string, actual: string) => model.invoke([
  ["system", "You grade a documentation Q&A agent. Set pass to true if the agent's answer conveys the facts of the reference answer and contradicts none of them."],
  ["human", `Reference answer:\n${expected}\n\nAgent answer:\n${actual}`],
]);
