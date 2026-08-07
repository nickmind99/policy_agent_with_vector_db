import { Router } from "express";
import { runAgent } from "../agent/agent";
import { appendToHistory, ensureThreadId, getConversation } from "../agent/memory";
import { fail } from "../utils/http";

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
      return fail(res, 400, "Message is required");
    }

    const question = message.trim();

    const threadId = await ensureThreadId(incomingThreadId);
    const history = await getConversation(threadId);

    const result = await runAgent(question, namespace, history);

    if (result.blocked) {
      return fail(res, 400, "Your question does not comply with our policy rules", { threadId });
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

    return fail(res, 500, "Some error occurred");
  }
});
