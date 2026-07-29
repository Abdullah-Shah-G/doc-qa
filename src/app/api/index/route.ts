import { NextResponse } from "next/server";
import path from "path";
import { parseDocument } from "@/lib/document-parser";
import { chunkDocument } from "@/lib/chunker";
import { generateEmbedding } from "@/lib/openai";
import { vectorStore } from "@/lib/vector-store";
import type { IndexResponse } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doc_id } = body;

    if (!doc_id) {
      return NextResponse.json(
        { error: "doc_id is required" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const fs = await import("fs/promises");
    const files = await fs.readdir(uploadDir);
    const docFile = files.find((f) => f.startsWith(doc_id));

    if (!docFile) {
      return NextResponse.json(
        { error: "Document not found. Upload it first." },
        { status: 404 }
      );
    }

    const filePath = path.join(uploadDir, docFile);
    const parsed = await parseDocument(filePath, docFile);
    const chunks = chunkDocument(parsed, doc_id);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.text);
      await vectorStore.upsert([{ ...chunk, embedding }]);
    }

    const response: IndexResponse = {
      doc_id,
      chunks_count: chunks.length,
      success: true,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Index error:", error);
    return NextResponse.json(
      { error: "Failed to index document" },
      { status: 500 }
    );
  }
}
