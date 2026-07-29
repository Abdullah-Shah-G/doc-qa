import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DocChunk } from "./types";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

const SYSTEM_PROMPT = `You are DocAssistant. Use ONLY the retrieved context passages to answer the user's question. If the retrieved context does not contain enough information to answer, say: "I don't have enough information in the documents to answer that." When you answer, include inline citations after each claim in the form [source: <filename>#page:<n>]. Keep the answer concise and provide a short summary and optionally a bulleted list of sources. Do not hallucinate.`;

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getClient().getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function generateAnswer(
  question: string,
  chunks: DocChunk[]
): Promise<{ answer: string; rawOutput: string }> {
  const context = chunks
    .map(
      (c, i) =>
        `[Context ${i + 1}] ${c.text}\n[source: ${c.filename}#page:${c.page}]`
    )
    .join("\n\n");

  const userMessage = `Using only the context above, answer: ${question}`;

  const model = getClient().getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { maxOutputTokens: 512, temperature: 0.1 },
  });

  const result = await model.generateContent(`Context:\n${context}\n\n${userMessage}`);
  const rawOutput = result.response.text() || "";
  const answer = rawOutput || "I couldn't generate an answer.";
  return { answer, rawOutput };
}
