import { Router } from "express";
import { runAgent } from "../agent/agent";

export const agentRouter = Router();

// eslint-disable-next-line @typescript-eslint/no-misused-promises
agentRouter.post("/chat", async (req, res) => {
  try {
    const { message, namespace } = req.body as {
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

    const result = await runAgent(message.trim(), namespace);

    if (result.blocked) {
      return res.status(400).json({
        ok: false,
        message: "Your question does not comply with our policy rules",
      });
    }

    return res.json({
      ok: true,
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
