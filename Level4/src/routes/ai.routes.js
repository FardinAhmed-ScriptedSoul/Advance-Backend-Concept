import { Router } from "express";
import { invokeGemini, invokeGroq } from "../services/ai.service.js";
import { agentGraph } from "../graph/agent.js";
import { requireText } from "../utils/validation.js";

export const createAiRouter = () => {
  const router = Router();

  router.post("/gemeni", async (req, res) => {
    const validated = requireText(req.body?.input);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const aiMessage = await invokeGemini(validated.value);
      return res.status(200).json({ ai: aiMessage.content });
    } catch (error) {
      console.error("Gemini request failed:", error);
      return res.status(502).json({ message: "Failed to generate response" });
    }
  });

  router.post("/groq", async (req, res) => {
    const validated = requireText(req.body?.input);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const aiMessage = await invokeGroq(validated.value);
      return res.status(200).json({ ai: aiMessage.content });
    } catch (error) {
      console.error("Groq request failed:", error);
      return res.status(502).json({ message: "Failed to generate response" });
    }
  });

  router.post("/langgraph", async (req, res) => {
    const validated = requireText(req.body?.input);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    const threadId =
      req.body?.threadId ||
      req.headers["x-thread-id"] ||
      "default";

    if (typeof threadId !== "string" || !threadId.trim()) {
      return res.status(400).json({ message: "threadId must be a non-empty string" });
    }

    try {
      const result = await agentGraph.invoke(
        {
          prompt: validated.value,
          aiMsg: "",
          messages: [{ role: "user", content: validated.value }],
        },
        { configurable: { thread_id: threadId } }
      );

      return res.status(200).json({
        threadId,
        prompt: result.prompt,
        ai: result.aiMsg,
      });
    } catch (error) {
      console.error("LangGraph Groq request failed:", error);
      return res.status(502).json({ message: "Failed to generate response" });
    }
  });

  router.get("/langgraph/state", async (req, res) => {
    const threadId =
      req.query.threadId ||
      req.headers["x-thread-id"] ||
      "default";

    if (typeof threadId !== "string" || !threadId.trim()) {
      return res.status(400).json({ message: "threadId must be a non-empty string" });
    }

    try {
      const snapshot = await agentGraph.getState({
        configurable: { thread_id: threadId },
      });

      return res.status(200).json({
        threadId,
        messages: snapshot.values.messages.map((message) => ({
          role: message.type ?? message.role,
          content: message.content,
        })),
      });
    } catch (error) {
      console.error("Failed to read LangGraph state:", error);
      return res.status(500).json({ message: "Failed to read conversation state" });
    }
  });

  return router;
};

