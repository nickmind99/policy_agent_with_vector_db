import { Response } from "express";

export const fail = (
  res: Response,
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
) => res.status(status).json({ ok: false, message, ...extra });
