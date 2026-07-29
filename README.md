# DocAssistant — Document Q&A (RAG)

Upload PDF or DOCX documents, index them with embeddings, and ask questions that return grounded answers with page citations.

## Features

- **Document Upload** — Drag-and-drop PDF/DOCX upload
- **Intelligent Chunking** — Paragraph-aware chunks (~700 tokens) with 150-token overlap
- **Vector Search** — OpenAI `text-embedding-3-small` + cosine similarity retrieval
- **Grounded Answers** — LLM generates answers using only retrieved context with inline `[source: filename#page:N]` citations
- **Confidence Scoring** — Auto-detects high/medium/low based on citation presence
- **Source Explorer** — View retrieved chunks and raw model output

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Embeddings**: OpenAI `text-embedding-3-small`
- **LLM**: OpenAI `gpt-4o-mini` (temp=0.1, max_tokens=512)
- **Vector Store**: In-memory with cosine similarity
- **Documents**: PDF (`pdf-parse`) and DOCX (`mammoth`)
- **Chunking**: Overlapping chunks with paragraph boundary preservation

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local and add your OpenAI API key
# OPENAI_API_KEY=sk-...

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Endpoints

### POST /api/upload
Upload a document file.

**Request:** `multipart/form-data` with `file` field (PDF/DOCX)

**Response:**
```json
{ "doc_id": "uuid", "filename": "report.pdf", "success": true }
```

### POST /api/index
Chunk and index a document with embeddings.

**Request:**
```json
{ "doc_id": "uuid" }
```

**Response:**
```json
{ "doc_id": "uuid", "chunks_count": 42, "success": true }
```

### POST /api/query
Ask a question against indexed documents.

**Request:**
```json
{ "doc_id": "uuid", "question": "What is the refund policy?", "top_k": 5 }
```

**Response:**
```json
{
  "answer": "Refunds are offered within 30 days [source: policy.pdf#page:2].",
  "sources": [{ "filename": "policy.pdf", "page": 2, "chunk_id": "..." }],
  "confidence": "high",
  "raw_model_output": "...",
  "retrieved_chunks": ["..."]
}
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── upload/route.ts    # File upload handler
│   │   ├── index/route.ts     # Document indexing
│   │   └── query/route.ts     # Question answering
│   ├── page.tsx               # Main UI
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── upload-zone.tsx        # Drag-and-drop upload
│   └── query-interface.tsx    # Q&A interface with results
├── lib/
│   ├── types.ts               # TypeScript types
│   ├── document-parser.ts     # PDF/DOCX parsing
│   ├── chunker.ts             # Text chunking with overlap
│   ├── vector-store.ts        # In-memory vector DB
│   └── openai.ts              # Embeddings + LLM
└── types/
    └── pdf-parse.d.ts         # Type declaration
```

## Evaluation Metrics

- **Groundedness**: % claims with valid cited source
- **Accuracy**: Human-evaluated correctness
- **Retrieval Recall**: % questions with supporting chunks in top-k

## Extensions (Ideas)

- Multi-doc search across multiple documents
- Metadata filters (by tag, date)
- QA-to-Find-Document: return best doc when multiple
- Persistent vector store (Pinecone, Chroma, pgvector)
