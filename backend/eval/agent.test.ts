import { afterAll, expect, it } from "vitest";
import { runAgent } from "../src/agent/agent";
import { getMongoClient } from "../src/utils/mongo";
import { NAMESPACE, judgeAnswer, seedKb, wipeKb } from "./setup";

const QUESTION = "How much does the Pro plan cost?";
const REFERENCE = "Pro costs 29 USD per user per month.";

afterAll(async () => {
  await wipeKb();
  await (await getMongoClient()).close();
});

it("answers a pricing question from the docs and cites them", async () => {
  await seedKb();

  const result = await runAgent(QUESTION, NAMESPACE);

  if (result.blocked) throw new Error("the guard blocked an ordinary question");

  const verdict = await judgeAnswer(REFERENCE, result.answer);

  expect(verdict.pass, verdict.reason).toBe(true);
  expect(result.citations.map((citation) => citation.source)).toContain("pricing.md");
}, 120_000);
