"use client";

import { useState, useRef } from "react";

interface UploadZoneProps {
  onIndexed: (docId: string, filename: string) => void;
}

export default function UploadZone({ onIndexed }: UploadZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [docInfo, setDocInfo] = useState<{ docId: string; filename: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      const docId = uploadData.doc_id;
      const filename = uploadData.filename;

      setStatus("Indexing document...");
      setIndexing(true);

      const indexRes = await fetch("/api/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      });

      if (!indexRes.ok) {
        const err = await indexRes.json();
        throw new Error(err.error || "Indexing failed");
      }

      const indexData = await indexRes.json();
      setDocInfo({ docId, filename });
      setStatus(`Indexed ${indexData.chunks_count} chunks from "${filename}"`);
      onIndexed(docId, filename);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setUploading(false);
      setIndexing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${uploading ? "uploading" : ""}`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          hidden
        />
        <div className="upload-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="upload-text">
          {uploading
            ? status
            : "Drop a PDF or DOCX here, or click to browse"}
        </p>
        <p className="upload-hint">Supports .pdf and .docx files</p>
      </div>

      {status && !uploading && (
        <div className={`status-badge ${status.startsWith("Error") ? "error" : "success"}`}>
          {status}
        </div>
      )}

      {docInfo && !uploading && (
        <button
          className="new-doc-btn"
          onClick={() => {
            setDocInfo(null);
            setStatus("");
            if (fileRef.current) fileRef.current.value = "";
          }}
        >
          Upload another document
        </button>
      )}
    </div>
  );
}
