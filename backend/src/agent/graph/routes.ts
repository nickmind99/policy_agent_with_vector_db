import { Send } from "@langchain/langgraph";
import { AgentStateType } from "./state";

export const fanOutToWorkers = (state: AgentStateType): Send[] => state.subQuestions.map(
  (subQuestion) => new Send("research", { subQuestion, namespace: state.namespace }),
);
