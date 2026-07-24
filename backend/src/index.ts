import express from "express";
import cors from "cors";
import { kbRouter } from "./routes/kb";
import { env } from "./utils/env";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use("/kb", kbRouter);

const port = Number(env.PORT);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
