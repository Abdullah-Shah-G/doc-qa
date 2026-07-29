import { NextResponse } from "next/server";
import { generateEmbedding, generateAnswer } from "@/lib/openai";
import { vectorStore } from "@/lib/vector-store";
import type { QueryResponse, Source } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doc_id, question, top_k = 5 } = body;

    if (!question) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const allChunks = await vectorStore.getByDocId(doc_id || "");
    let retrievedChunks;

    if (allChunks.length > 0) {
      const queryEmbedding = await generateEmbedding(question);
      const results = await vectorStore.query(queryEmbedding, top_k);
      retrievedChunks = results.map((r) => r.chunk);
    } else {
      const queryEmbedding = await generateEmbedding(question);
      const results = await vectorStore.query(queryEmbedding, top_k);
      retrievedChunks = results.map((r) => r.chunk);
    }

    if (retrievedChunks.length === 0) {
      const response: QueryResponse = {
        answer: "No documents have been indexed yet. Please upload and index a document first.",
        sources: [],
        confidence: "low",
        raw_model_output: "",
        retrieved_chunks: [],
      };
      return NextResponse.json(response);
    }

    const { answer, rawOutput } = await generateAnswer(question, retrievedChunks);

    const sources: Source[] = retrievedChunks.map((c) => ({
      filename: c.filename,
      page: c.page,
      chunk_id: c.id,
    }));

    const uniqueSources = sources.filter(
      (s, i, arr) => arr.findIndex((x) => x.filename === s.filename && x.page === s.page) === i
    );

    const confidence: "high" | "medium" | "low" =
      answer.includes("[source:") && answer.length > 50
        ? "high"
        : answer.includes("I don't have enough information")
          ? "low"
          : "medium";

    const response: QueryResponse = {
      answer,
      sources: uniqueSources,
      confidence,
      raw_model_output: rawOutput,
      retrieved_chunks: retrievedChunks.map((c) => c.text.slice(0, 200) + "..."),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Query error:", error);
    const isQuota = error?.status === 429 || error?.code === "insufficient_quota";
    return NextResponse.json(
      { error: isQuota ? "API quota exceeded. Check your OpenAI billing." : "Failed to process query" },
      { status: isQuota ? 503 : 500 }
    );
  }
}
