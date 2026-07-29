"use client";

import { useState } from "react";
import type { QueryResponse, Source } from "@/lib/types";

interface QueryInterfaceProps {
  docId: string | null;
  filename: string | null;
}

export default function QueryInterface({ docId, filename }: QueryInterfaceProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          question: question.trim(),
          top_k: 5,
        }),
      });

      if (!res.ok) throw new Error("Query failed");
      const data: QueryResponse = await res.json();
      setResult(data);
    } catch {
      setResult({
        answer: "Sorry, something went wrong.",
        sources: [],
        confidence: "low",
        raw_model_output: "",
        retrieved_chunks: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function getConfidenceClass(c: string) {
    if (c === "high") return "conf-high";
    if (c === "medium") return "conf-med";
    return "conf-low";
  }

  return (
    <div className="query-section">
      {!docId ? (
        <div className="query-placeholder">
          <p>Upload and index a document to start asking questions.</p>
        </div>
      ) : (
        <>
          <div className="active-doc">
            Active document: <strong>{filename}</strong>
          </div>

          <form className="query-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your document..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !question.trim()}>
              {loading ? "Searching..." : "Ask"}
            </button>
          </form>

          {result && (
            <div className="result-card">
              <div className="result-header">
                <span className={`confidence ${getConfidenceClass(result.confidence)}`}>
                  {result.confidence} confidence
                </span>
              </div>

              <div className="result-answer">
                <p>{result.answer}</p>
              </div>

              {result.sources.length > 0 && (
                <div className="result-sources">
                  <h4>Sources</h4>
                  <ul>
                    {result.sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={`#source-${i}`}
                          onClick={(e) => e.preventDefault()}
                        >
                          {s.filename}#page:{s.page}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                className="toggle-raw"
                onClick={() => setShowRaw(!showRaw)}
              >
                {showRaw ? "Hide" : "Show"} raw model output
              </button>

              {showRaw && result.raw_model_output && (
                <pre className="raw-output">{result.raw_model_output}</pre>
              )}

              {result.retrieved_chunks.length > 0 && (
                <details className="retrieved-details">
                  <summary>Retrieved chunks ({result.retrieved_chunks.length})</summary>
                  <ol className="chunks-list">
                    {result.retrieved_chunks.map((chunk, i) => (
                      <li key={i}>
                        <p>{chunk}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
