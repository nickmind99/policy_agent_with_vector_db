// START -> plan -> Send x N -> research -> synthesize -> END

import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { planNode, researchNode, synthesizeNode } from "./nodes";
import { fanOutToWorkers } from "./routes";

export const agentGraph = new StateGraph(AgentState)
  .addNode("plan", planNode)
  .addNode("research", researchNode, { retryPolicy: { maxAttempts: 3 } })
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "plan")
  .addConditionalEdges("plan", fanOutToWorkers, ["research"])
  .addEdge("research", "synthesize")
  .addEdge("synthesize", END)
  .compile();
