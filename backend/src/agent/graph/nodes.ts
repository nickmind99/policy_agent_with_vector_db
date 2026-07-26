import { z } from "zod";
import { chatModel, judgeModel } from "../../utils/openai";
import { retrieveRelevantResults } from "../../kb/retriever";
import { CHECK_PROMPT, GUARD_PROMPT, PLANNER_PROMPT, SYNTHESIZER_PROMPT } from "../policy";
import { formatFindings, toContexts } from "../context";
import { Draft, Finding, SubQuestion } from "../types";
import { AgentStateType, MAX_REVISIONS, MAX_SUB_QUESTIONS, RETRIEVAL_K, WorkerInput } from "./state";

const REFUSAL = "I don't know based on the available documentation.";

const GuardSchema = z.object({
  injection: z.boolean(),
});

const PlanSchema = z.object({
  subQuestions: z.array(z.object({
    question: z.string(),
    query: z.string(),
  })).min(1).max(MAX_SUB_QUESTIONS),
});

const DraftSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    chunkId: z.number(),
    preview: z.string(),
  })),
});

const CheckSchema = z.object({
  grounded: z.boolean(),
  issues: z.array(z.string()),
});

const guard = judgeModel.withStructuredOutput(GuardSchema, { name: "guard" });
const planner = chatModel.withStructuredOutput(PlanSchema, { name: "plan" });
const synthesizer = chatModel.withStructuredOutput(DraftSchema, { name: "draft" });
const checker = judgeModel.withStructuredOutput(CheckSchema, { name: "check" });

export const guardNode = async (state: AgentStateType) => {
  try {
    const verdict = await guard.invoke([
      ["system", GUARD_PROMPT],
      ["human", state.question],
    ]);

    return { injectionDetected: verdict.injection };
  } catch (e) {
    // fail open: an OpenAI hiccup must not block real users
    console.log("[guard] check failed, letting the question through", e);

    return { injectionDetected: false };
  }
};

// joins guard and plan: a branch reads the state as of the start of its own superstep,
// so the guard verdict is only visible from a node that waits for both
export const gateNode = () => ({});

export const planNode = async (state: AgentStateType) => {
  const fallback: SubQuestion[] = [{ id: "sq-0", question: state.question, query: state.question }];

  try {
    const plan = await planner.invoke([
      ["system", PLANNER_PROMPT],
      ["human", state.question],
    ]);

    const subQuestions = plan.subQuestions.map((item, index) => ({
      id: `sq-${index}`,
      question: item.question,
      query: item.query,
    }));

    return { subQuestions: subQuestions.length ? subQuestions : fallback };
  } catch (e) {
    // the graph must not die because the planner did - degrade to a single search
    console.log("[plan] planner failed, using the question as is", e);

    return { subQuestions: fallback };
  }
};

export const researchNode = async (state: WorkerInput) => {
  const subQuestion = state.subQuestion;

  if (!subQuestion) return { findings: [] };

  const { docs } = await retrieveRelevantResults(subQuestion.query, state.namespace, RETRIEVAL_K);

  const finding: Finding = {
    question: subQuestion.question,
    contexts: toContexts(docs),
  };

  return { findings: [finding] };
};

export const synthesizeNode = async (state: AgentStateType) => {
  const input = [
    `Original question: ${state.question}`,
    "",
    "Retrieved documentation:",
    "",
    formatFindings(state.findings),
  ];

  if (state.critique.length) {
    input.push("", "Your previous answer was rejected for:", ...state.critique.map((issue: string) => `- ${issue}`));
  }

  const draft = await synthesizer.invoke([
    ["system", SYNTHESIZER_PROMPT],
    ["human", input.join("\n")],
  ]);

  return { draft };
};

const findIssues = async (draft: Draft, findings: Finding[]): Promise<string[]> => {
  const retrieved = new Set(findings.flatMap(
    (finding) => finding.contexts.map((context) => `${context.source}#${context.chunkId}`),
  ));

  const invented = draft.citations
    .filter((citation) => !retrieved.has(`${citation.source}#${citation.chunkId}`))
    .map((citation) => `Citation "${citation.source}" #${citation.chunkId} was never retrieved.`);

  if (invented.length) return invented;

  try {
    const verdict = await checker.invoke([
      ["system", CHECK_PROMPT],
      ["human", [
        "Retrieved documentation:",
        "",
        formatFindings(findings),
        "",
        "Draft answer:",
        draft.answer,
      ].join("\n")],
    ]);

    return verdict.grounded ? [] : verdict.issues;
  } catch (e) {
    // fail open: a broken checker must not turn every answer into a refusal
    console.log("[check] verification failed, accepting the draft", e);

    return [];
  }
};

export const checkNode = async (state: AgentStateType) => {
  const revision = state.revision + 1;
  const critique = state.draft ? await findIssues(state.draft, state.findings) : [];

  if (critique.length && revision > MAX_REVISIONS) {
    return { revision, critique, draft: { answer: REFUSAL, citations: [] } };
  }

  return { revision, critique };
};
