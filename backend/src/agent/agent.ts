import { z } from "zod";
import { createAgent, providerStrategy } from "langchain";
import { chatModel } from "../utils/openai";
import { knowledgeBaseSearchTool } from "./tools";
import { AGENT_SYSTEM_PROMPT } from "./policy";

const AgentResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({
    source: z.string(),
    chunkId: z.string(),
    preview: z.string(),
  })),
});

type AgentResponse = z.infer<typeof AgentResponseSchema>;

const agent = createAgent({
  model: chatModel,
  tools: [knowledgeBaseSearchTool],
  responseFormat: providerStrategy(AgentResponseSchema),
  systemPrompt: AGENT_SYSTEM_PROMPT,
});

export const runAgent = async (messages: { role: string; content: string }[]): Promise<AgentResponse> => {
  const result = await agent.invoke({ messages });

  if (result?.structuredResponse) return {
    answer: result?.structuredResponse?.answer,
    citations: result?.structuredResponse?.citations ?? [],
  };

  return {
    answer: "",
    citations: [],
  };
};
