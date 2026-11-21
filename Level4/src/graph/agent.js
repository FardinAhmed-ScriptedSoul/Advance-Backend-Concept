import {
  END,
  START,
  MemorySaver,
  MessagesValue,
  StateGraph,
  StateSchema,
  UntrackedValue,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { groqModel } from "../llms/groq.js";
import { createTavilyTool } from "../tools/tavily.js";

const AgentState = new StateSchema({
  messages: MessagesValue,
  prompt: new UntrackedValue(undefined),
  aiMsg: new UntrackedValue(undefined),
});

const tavilyTool = createTavilyTool();
const tools = [tavilyTool];
const toolNode = new ToolNode(tools);
const modelWithTools = groqModel.bindTools(tools);
const checkPointer = new MemorySaver();

const groqNode = async (state) => {
  const prompt = state.prompt;
  if (!prompt?.trim()) {
    throw new Error("prompt is required");
  }

  const aiMessage = await modelWithTools.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant. Use the tavily_search tool for current information, news, web research, or when you need facts from the internet.",
    },
    ...state.messages,
  ]);

  const hasToolCalls =
    Array.isArray(aiMessage.tool_calls) && aiMessage.tool_calls.length > 0;
  const reply =
    typeof aiMessage.content === "string"
      ? aiMessage.content
      : JSON.stringify(aiMessage.content);

  return {
    prompt,
    aiMsg: hasToolCalls ? state.aiMsg : reply,
    messages: [aiMessage],
  };
};

const shouldContinue = (state) => {
  const lastMessage = state.messages.at(-1);
  return Array.isArray(lastMessage?.tool_calls) && lastMessage.tool_calls.length > 0
    ? "tools"
    : END;
};

export const agentGraph = new StateGraph(AgentState)
  .addNode("groq_llm", groqNode)
  .addNode("tools", toolNode)
  .addEdge(START, "groq_llm")
  .addConditionalEdges("groq_llm", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "groq_llm")
  .compile({ checkpointer: checkPointer });

