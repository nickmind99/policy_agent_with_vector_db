import { Router } from "express";
import { runAgent } from "../agent/agent";
import { appendToHistory, ensureThreadId, getConversation } from "../agent/memory";

export const agentRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-misused-promises
agentRouter.post("/chat", async (req, res) => {
  try {
    const { message, namespace, threadId: incomingThreadId } = req.body as {
      message?: string;
      namespace?: string;
      threadId?: string;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Message is required",
      });
    }

    const question = message.trim();

    const threadId = await ensureThreadId(incomingThreadId);
    const history = await getConversation(threadId);

    const result = await runAgent(question, namespace, history);

    if (result.blocked) {
      return res.status(400).json({
        ok: false,
        threadId,
        message: "Your question does not comply with our policy rules",
      });
    }

    await appendToHistory(
      threadId,
      { role: "user", content: question },
      { role: "assistant", content: result.answer },
    );

    return res.json({
      ok: true,
      threadId,
      answer: result.answer,
      citations: result.citations,
      plan: result.plan,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      ok: false,
      message: "Some error occurred",
    });
  }
});
