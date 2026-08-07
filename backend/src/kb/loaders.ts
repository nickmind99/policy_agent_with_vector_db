import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

export type SupportMime = "application/pdf" | "text/markdown" | "text/plain";

interface LoadFileArgs {
  filePath: string;
  mimeType: SupportMime;
  originalName: string;
}

const withSource = (docs: Document[], source: string): Document[] => docs.map((doc) => ({
  ...doc,
  metadata: {
    ...doc.metadata,
    source,
  },
}));

export const loadFileAsDocuments = async (args: LoadFileArgs): Promise<Document[]> => {
  const { filePath,
    mimeType,
    originalName } = args;

  const ext = getExt(originalName);

  if (!ext) throw new Error("Extension of file is missing");

  const isMarkdown = ext === "md" || ext === "markdown" || mimeType === "text/markdown";
  const isTxt = ext === "txt" || mimeType === "text/plain";
  const isPdf = ext === "pdf" || mimeType === "application/pdf";

  if (isPdf) {
    const docs = await new PDFLoader(filePath).load();

    return withSource(docs, originalName);
  }

  if (isTxt || isMarkdown) {
    const docs = await new TextLoader(filePath).load();

    return withSource(docs, originalName);
  }

  return [];
};

const getExt = (originalName: string): string | null => {
  const splitOriginalName = originalName.split(".");

  return splitOriginalName[splitOriginalName.length - 1].toLowerCase() ?? null;
};
