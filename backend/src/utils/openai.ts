import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { env } from "./env";

export const chatModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.2,
  openAIApiKey: env.OPENAI_API_KEY,
});

export const judgeModel = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0,
  openAIApiKey: env.OPENAI_API_KEY,
});

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: env.OPENAI_API_KEY,
});
