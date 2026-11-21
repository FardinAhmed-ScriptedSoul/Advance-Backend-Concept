import { ChatGroq } from "@langchain/groq";

export const groqModel = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0,
  maxRetries: 2,
  maxTokens: 500,
});

