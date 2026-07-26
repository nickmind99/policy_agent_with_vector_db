import { Annotation } from "@langchain/langgraph";
import { Draft, Finding, SubQuestion } from "../types";

export const MAX_SUB_QUESTIONS = 4;
export const RETRIEVAL_K = 2;
export const MAX_REVISIONS = 1;

export const AgentState = Annotation.Root({
  question: Annotation<string>,
  namespace: Annotation<string>,
  injectionDetected: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  subQuestions: Annotation<SubQuestion[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  subQuestion: Annotation<SubQuestion | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  findings: Annotation<Finding[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  draft: Annotation<Draft | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  critique: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  revision: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
});

export type AgentStateType = typeof AgentState.State;

export type WorkerInput = Pick<AgentStateType, "subQuestion" | "namespace">;
