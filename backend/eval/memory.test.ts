import { afterAll, expect, it } from "vitest";
import { runAgent } from "../src/agent/agent";
import { appendToHistory, ensureThreadId, getConversation } from "../src/agent/memory";
import { getMongoClient } from "../src/utils/mongo";
import { PLAN_DOCS, judgeAnswer, seedKb, wipeKb, wipeThread } from "./setup";

const NAMESPACE = "__test_memory__";
const FIRST = "How much does the Pro plan cost?";
const FOLLOW_UP = "And how many projects does it include?";
const REFERENCE = "The Pro plan includes 25 projects, and no other plan's project limit is given.";

const threads: string[] = [];

afterAll(async () => {
  await Promise.all(threads.map(wipeThread));
  await wipeKb(NAMESPACE);
  await (await getMongoClient()).close();
});

const openThread = async (): Promise<string> => {
  const threadId = await ensureThreadId();

  threads.push(threadId);

  return threadId;
};

// mirrors one turn of POST /chat, so the test covers the real read-run-write loop
const chat = async (threadId: string, message: string) => {
  const history = await getConversation(threadId);
  const result = await runAgent(message, NAMESPACE, history);

  if (result.blocked) throw new Error(`the guard blocked "${message}"`);

  await appendToHistory(
    threadId,
    { role: "user", content: message },
    { role: "assistant", content: result.answer },
  );

  return result;
};

it("answers a follow-up that only makes sense after the previous turn", async () => {
  await seedKb(NAMESPACE, PLAN_DOCS);

  const threadId = await openThread();

  await chat(threadId, FIRST);

  const followUp = await chat(threadId, FOLLOW_UP);
  const verdict = await judgeAnswer(REFERENCE, followUp.answer);

  expect(verdict.pass, verdict.reason).toBe(true);

  const stored = await getConversation(threadId);

  expect(stored.map((message) => message.role)).toEqual(["user", "assistant", "user", "assistant"]);
  expect(stored.map((message) => message.content)[0]).toBe(FIRST);
  expect(stored.map((message) => message.content)[2]).toBe(FOLLOW_UP);
}, 240_000);

it("starts a fresh thread when the client sends an id the database does not know", async () => {
  const threadId = await ensureThreadId("__missing__");

  threads.push(threadId);

  expect(threadId).not.toBe("__missing__");
  expect(await getConversation(threadId)).toEqual([]);
}, 60_000);
