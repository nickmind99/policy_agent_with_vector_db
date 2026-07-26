import dotenv from "dotenv";
dotenv.config();

import { z } from "zod";

const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, "Api key is needed"),
  PORT: z.string().default("5000"),
  MONGODB_ATLAS_URI: z.string().min(1, "MongoDB uri is needed"),
  MONGODB_DB_NAME: z.string().min(1, "MongoDB db name is needed"),
  KB_COLLECTION_NAME: z.string().min(1, "MongoDB collection is needed"),
  KB_VECTOR_SEARCH_INDEX: z.string().min(1, "MongoDB vector search index is needed"),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) throw new Error("Error occurred while parsing env");

const envData = parsedEnv.data;

export const env = Object.freeze({
  OPENAI_API_KEY: envData.OPENAI_API_KEY,
  PORT: envData.PORT,
  MONGODB_ATLAS_URI: envData.MONGODB_ATLAS_URI,
  MONGODB_DB_NAME: envData.MONGODB_DB_NAME,
  KB_COLLECTION_NAME: envData.KB_COLLECTION_NAME,
  KB_VECTOR_SEARCH_INDEX: envData.KB_VECTOR_SEARCH_INDEX,
});
