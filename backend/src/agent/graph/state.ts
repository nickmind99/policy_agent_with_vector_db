import { Annotation } from "@langchain/langgraph";
import { ChatMessage, Draft, Finding, SubQuestion } from "../types";

export const MAX_SUB_QUESTIONS = 4;
export const RETRIEVAL_K = 2;
export const MAX_REVISIONS = 3;

const lastValue = <T>(defaultValue: () => T) => Annotation<T>({
  reducer: (_prev: T, next: T) => next,
  default: defaultValue,
});

export const AgentState = Annotation.Root({
  question: Annotation<string>,
  namespace: Annotation<string>,
  history: lastValue<ChatMessage[]>(() => []),
  injectionDetected: lastValue<boolean>(() => false),
  subQuestions: lastValue<SubQuestion[]>(() => []),
  subQuestion: lastValue<SubQuestion | null>(() => null),
  findings: Annotation<Finding[]>({
    reducer: (prev, next) => prev.concat(next),
    default: () => [],
  }),
  draft: lastValue<Draft | null>(() => null),
  critique: lastValue<string[]>(() => []),
  revision: lastValue<number>(() => 0),
});

export type AgentStateType = typeof AgentState.State;

export type WorkerInput = Pick<AgentStateType, "subQuestion" | "namespace">;
