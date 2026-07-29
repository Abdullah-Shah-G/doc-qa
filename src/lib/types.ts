export interface DocChunk {
  id: string;
  doc_id: string;
  filename: string;
  text: string;
  page: number;
  paragraph_index: number;
  embedding?: number[];
}

export interface ParsedDocument {
  text: string;
  pages: { page: number; text: string }[];
  filename: string;
}

export interface Source {
  filename: string;
  page: number;
  chunk_id: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  confidence: "high" | "medium" | "low";
  raw_model_output: string;
  retrieved_chunks: string[];
}

export interface UploadResponse {
  doc_id: string;
  filename: string;
  success: boolean;
}

export interface IndexResponse {
  doc_id: string;
  chunks_count: number;
  success: boolean;
}
