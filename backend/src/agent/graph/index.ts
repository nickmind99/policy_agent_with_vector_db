import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { gateNode, guardNode, planNode, researchNode, synthesizeNode } from "./nodes";
import { fanOutToWorkers } from "./routes";

export const agentGraph = new StateGraph(AgentState)
  .addNode("guard", guardNode)
  .addNode("plan", planNode)
  .addNode("gate", gateNode)
  .addNode("research", researchNode, { retryPolicy: { maxAttempts: 3 } })
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "guard")
  .addEdge(START, "plan")
  .addEdge(["guard", "plan"], "gate")
  .addConditionalEdges("gate", fanOutToWorkers, ["research", END])
  .addEdge("research", "synthesize")
  .addEdge("synthesize", END)
  .compile();
