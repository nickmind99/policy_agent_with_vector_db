import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";

type SupportMime = "application/pdf" | "text/markdown" | "text/plain";

interface LoadFileArgs {
  filePath: string;
  mimeType: SupportMime;
  originalName: string;
}

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
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    return docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: originalName,
      },
    }));
  }

  if (isTxt || isMarkdown) {
    const loader = new TextLoader(filePath);
    const docs = await loader.load();

    return docs.map((doc) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        source: originalName,
      },
    }));
  }

  return [];
};

const getExt = (originalName: string): string | null => {
  const splitOriginalName = originalName.split(".");

  return splitOriginalName[splitOriginalName.length - 1].toLowerCase() ?? null;
};
