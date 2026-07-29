import type { DocChunk } from "./types";

interface StoredChunk extends DocChunk {
  embedding: number[];
}

class InMemoryVectorStore {
  private chunks: Map<string, StoredChunk> = new Map();

  async upsert(chunks: (DocChunk & { embedding: number[] })[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, chunk);
    }
  }

  async query(
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<{ chunk: StoredChunk; score: number }[]> {
    const results: { chunk: StoredChunk; score: number }[] = [];

    for (const chunk of this.chunks.values()) {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      results.push({ chunk, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async getByDocId(docId: string): Promise<StoredChunk[]> {
    return Array.from(this.chunks.values()).filter(
      (c) => c.doc_id === docId
    );
  }

  async deleteByDocId(docId: string): Promise<void> {
    for (const [id, chunk] of this.chunks) {
      if (chunk.doc_id === docId) {
        this.chunks.delete(id);
      }
    }
  }

  async count(): Promise<number> {
    return this.chunks.size;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export const vectorStore = new InMemoryVectorStore();
