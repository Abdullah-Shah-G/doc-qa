"use client";

import { useState } from "react";
import UploadZone from "@/components/upload-zone";
import QueryInterface from "@/components/query-interface";

export default function Home() {
  const [activeDoc, setActiveDoc] = useState<{
    docId: string;
    filename: string;
  } | null>(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>DocAssistant</h1>
        <p className="subtitle">Upload a document and ask questions with AI</p>
      </header>

      <main className="app-main">
        <section className="panel upload-panel">
          <h2>Upload Document</h2>
          <UploadZone
            onIndexed={(docId, filename) =>
              setActiveDoc({ docId, filename })
            }
          />
        </section>

        <section className="panel query-panel">
          <h2>Ask Questions</h2>
          <QueryInterface
            docId={activeDoc?.docId ?? null}
            filename={activeDoc?.filename ?? null}
          />
        </section>
      </main>
    </div>
  );
}
