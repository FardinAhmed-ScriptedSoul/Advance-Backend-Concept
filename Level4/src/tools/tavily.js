import { TavilySearch } from "@langchain/tavily";

export const createTavilyTool = () => {
  const tavilyApiKey =
    process.env.TAVILY_API_KEY ||
    process.env["process.env.TAVILY_API_KEY"];

  if (!tavilyApiKey) {
    throw new Error(
      "TAVILY_API_KEY is missing. Add TAVILY_API_KEY=your-key to Level4/.env."
    );
  }

  return new TavilySearch({
    maxResults: 5,
    topic: "general",
    tavilyApiKey,
  });
};

