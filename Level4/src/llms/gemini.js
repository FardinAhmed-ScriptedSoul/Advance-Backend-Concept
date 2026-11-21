import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0,
  maxRetries: 2,
});

