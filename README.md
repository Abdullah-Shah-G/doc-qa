# DocAssistant

Install `requirements.txt` in a virtual environment, set `GEMINI_API_KEY` in the environment or `.env`, and run `uvicorn main:app --reload`. Open `/` to upload a text PDF (up to 20 MB), index it, and ask questions. Scanned PDFs need OCR before uploading.

Uploads and vector indexes are stored relative to the application directory. Keep `vector_store` writable only by the application: FAISS metadata uses pickle and must never be replaced with untrusted uploaded indexes.

This is a local demo without user accounts or document ownership checks. UUIDs are not authorization. Add authentication, per-user access controls and quota limits before hosting private documents publicly.

For offline regression checks, install `httpx`, ensure Node.js is available, and run `python -m unittest -v`. Tests cover path traversal, query limits, upload cleanup, blank PDFs and browser script syntax. Live Gemini/embedding behavior needs a configured account.
