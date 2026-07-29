import OpenAI from "openai";
import type { DocChunk } from "./types";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are DocAssistant. Use ONLY the retrieved context passages to answer the user's question. If the retrieved context does not contain enough information to answer, say: "I don't have enough information in the documents to answer that." When you answer, include inline citations after each claim in the form [source: <filename>#page:<n>]. Keep the answer concise and provide a short summary and optionally a bulleted list of sources. Do not hallucinate.`;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getClient().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
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

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 512,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Context:\n${context}\n\n${userMessage}` },
    ],
  });

  const rawOutput = response.choices[0]?.message?.content ?? "";
  const answer = rawOutput || "I couldn't generate an answer.";
  return { answer, rawOutput };
}
