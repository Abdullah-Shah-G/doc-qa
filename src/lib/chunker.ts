import type { DocChunk, ParsedDocument } from "./types";

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkDocument(doc: ParsedDocument, docId: string): DocChunk[] {
  const chunks: DocChunk[] = [];
  const targetTokens = 700;
  const overlapTokens = 150;

  for (const page of doc.pages) {
    const paragraphs = page.text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    let currentChunk = "";
    let paragraphIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphWithNewline = currentChunk ? "\n\n" + paragraph : paragraph;

      if (estimateTokens(currentChunk + paragraphWithNewline) <= targetTokens) {
        currentChunk += paragraphWithNewline;
      } else {
        if (currentChunk) {
          chunks.push({
            id: `${docId}_p${page.page}_${chunks.length}`,
            doc_id: docId,
            filename: doc.filename,
            text: currentChunk.trim(),
            page: page.page,
            paragraph_index: paragraphIndex,
          });
          paragraphIndex++;

          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(
            Math.max(0, words.length - Math.floor(overlapTokens / 0.75))
          );
          currentChunk = overlapWords.join(" ") + "\n\n" + paragraph;
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        id: `${docId}_p${page.page}_${chunks.length}`,
        doc_id: docId,
        filename: doc.filename,
        text: currentChunk.trim(),
        page: page.page,
        paragraph_index: paragraphIndex,
      });
    }
  }

  return chunks;
}
