import { Router } from "express";
import multer from "multer";
import { loadFileAsDocuments, SupportMime } from "../kb/loaders";
import { splitDocuments } from "../kb/splitters";
import { ingestDocuments } from "../kb/ingest";
import { DEFAULT_NAMESPACE } from "../utils/constants";
import { fail } from "../utils/http";

export const kbRouter = Router();

const upload = multer({
  dest: "uploads/",
  limits: {
    fieldSize: 10 * 1021 * 1024, // 10MB
  },
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
kbRouter.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const namespace = DEFAULT_NAMESPACE;

    if (!req.file) {
      return fail(res, 400, "No file uploaded.Please upload a file before proceeding!");
    }
    // dummy.pdf
    const { path, mimetype, originalname } = req.file;

    const rawDocs = await loadFileAsDocuments({
      filePath: path,
      mimeType: mimetype as SupportMime,
      originalName: originalname,
    });

    if (!rawDocs.length) {
      return fail(res, 400, "Unsupported or empty file");
    }

    const chunks = await splitDocuments(rawDocs);

    if (!chunks.length) {
      return fail(res, 400, "File loaded but produced no usable chunks after splitting is done");
    }

    // ingest to our vector store
    const summary = await ingestDocuments(namespace, chunks);

    return res.status(200).json({
      ok: summary.ok,
      namespace: summary.namespace,
      totalChunks: summary.totalChunks,
      sources: summary.sources,
    });
  } catch {
    return fail(res, 500, "Something went wrong while uploading the file");
  }
});
