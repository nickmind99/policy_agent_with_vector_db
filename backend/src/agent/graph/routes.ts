import { END, Send } from "@langchain/langgraph";
import { AgentStateType } from "./state";

export const fanOutToWorkers = (state: AgentStateType): Send[] | typeof END => {
  if (state.injectionDetected) return END;

  return state.subQuestions.map(
    (subQuestion) => new Send("research", { subQuestion, namespace: state.namespace }),
  );
};
