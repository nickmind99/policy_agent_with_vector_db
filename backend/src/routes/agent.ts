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

    const { answer, citations, plan } = await runAgent(message.trim(), namespace);

    return res.json({
      ok: true,
      answer,
      citations,
      plan,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      ok: false,
      message: "Some error occurred",
    });
  }
});
