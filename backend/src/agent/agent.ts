import { agentGraph } from "./graph";
import { AgentResult } from "./types";

const DEFAULT_NAMESPACE = "default";

export const runAgent = async (message: string, namespace: string = DEFAULT_NAMESPACE): Promise<AgentResult> => {
  const state = await agentGraph.invoke({ question: message, namespace });

  console.log("[agent] plan:", state.subQuestions.map((subQuestion) => subQuestion.query));

  return {
    answer: state.draft?.answer ?? "",
    citations: state.draft?.citations ?? [],
    plan: state.subQuestions,
  };
};
