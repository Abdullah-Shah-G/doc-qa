import fs from "fs/promises";
import path from "path";
import type { ParsedDocument } from "./types";

export async function parseDocument(
  filePath: string,
  filename: string
): Promise<ParsedDocument> {
  const ext = path.extname(filename).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (ext === ".pdf") {
    return parsePDF(buffer, filename);
  } else if (ext === ".docx") {
    return parseDOCX(buffer, filename);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Only PDF and DOCX are supported.`);
  }
}

async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  const pages = data.text
    .split(/\f/)
    .filter(Boolean)
    .map((text, i) => ({ page: i + 1, text: text.trim() }));

  return { text: data.text, pages, filename };
}

async function parseDOCX(buffer: Buffer, filename: string): Promise<ParsedDocument> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  const fullText = result.value;
  const lines = fullText.split("\n");
  const pageSize = 40;
  const pages: { page: number; text: string }[] = [];

  for (let i = 0; i < lines.length; i += pageSize) {
    const pageText = lines.slice(i, i + pageSize).join("\n").trim();
    if (pageText) {
      pages.push({ page: Math.floor(i / pageSize) + 1, text: pageText });
    }
  }

  return { text: fullText, pages, filename };
}
