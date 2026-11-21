import { geminiModel } from "../llms/gemini.js";
import { groqModel } from "../llms/groq.js";

export const invokeGemini = (input) => geminiModel.invoke(input);

export const invokeGroq = (input) =>
  groqModel.invoke([
    {
      role: "system",
      content: "you are a system administrator whose name is Fardin",
    },
    {
      role: "human",
      content: input,
    },
  ]);

