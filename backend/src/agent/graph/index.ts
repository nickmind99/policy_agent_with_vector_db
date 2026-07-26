import { END, START, StateGraph } from "@langchain/langgraph";
import { AgentState } from "./state";
import { checkNode, gateNode, guardNode, planNode, researchNode, synthesizeNode } from "./nodes";
import { fanOutToWorkers, routeAfterCheck } from "./routes";

export const agentGraph = new StateGraph(AgentState)
  .addNode("guard", guardNode)
  .addNode("plan", planNode)
  .addNode("gate", gateNode)
  .addNode("research", researchNode, { retryPolicy: { maxAttempts: 3 } })
  .addNode("synthesize", synthesizeNode)
  .addNode("check", checkNode)
  .addEdge(START, "guard")
  .addEdge(START, "plan")
  .addEdge(["guard", "plan"], "gate")
  .addConditionalEdges("gate", fanOutToWorkers, ["research", END])
  .addEdge("research", "synthesize")
  .addEdge("synthesize", "check")
  .addConditionalEdges("check", routeAfterCheck, ["synthesize", END])
  .compile();
