import { DEFAULT_NAMESPACE } from "../utils/constants";
import { agentGraph } from "./graph";
import { AgentResult, ChatMessage } from "./types";

export const runAgent = async (
  message: string,
  namespace: string = DEFAULT_NAMESPACE,
  history: ChatMessage[] = [],
): Promise<AgentResult> => {
  const state = await agentGraph.invoke({ question: message, namespace, history });

  if (state.injectionDetected) return { blocked: true };

  console.log("[agent] plan:", state.subQuestions.map((subQuestion) => subQuestion.query));

  return {
    blocked: false,
    answer: state.draft?.answer ?? "",
    citations: state.draft?.citations ?? [],
    plan: state.subQuestions,
  };
};
