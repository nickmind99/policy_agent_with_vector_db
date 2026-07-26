import { END, Send } from "@langchain/langgraph";
import { AgentStateType, MAX_REVISIONS } from "./state";

export const fanOutToWorkers = (state: AgentStateType): Send[] | typeof END => {
  if (state.injectionDetected) return END;

  return state.subQuestions.map(
    (subQuestion) => new Send("research", { subQuestion, namespace: state.namespace }),
  );
};

export const routeAfterCheck = (state: AgentStateType): "synthesize" | typeof END => {
  if (!state.critique.length || state.revision > MAX_REVISIONS) return END;

  return "synthesize";
};
