import os
import uuid
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel, Field

from chain import index_document, query_document

app = FastAPI(title="DocAssistant")

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

TEMPLATES_DIR = BASE_DIR / "templates"
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class QueryRequest(BaseModel):
    doc_id: uuid.UUID
    question: str = Field(min_length=1, max_length=4000, pattern=r"\S")
    top_k: int = Field(default=5, ge=1, le=20)


@app.get("/")
async def index():
    return HTMLResponse(render("index.html"))


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in (".pdf",):
        return JSONResponse({"error": "Only PDF files are supported"}, status_code=400)

    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}{ext}"
    filepath = UPLOAD_DIR / safe_name

    try:
        size = 0
        with open(filepath, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "PDF must be no larger than 20 MB.")
                if size == len(chunk) and not chunk.startswith(b"%PDF-"):
                    raise HTTPException(400, "Invalid PDF file.")
                f.write(chunk)
        if not size:
            raise HTTPException(400, "Empty PDF file.")
    except Exception:
        filepath.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    return JSONResponse({"doc_id": doc_id, "filename": file.filename, "success": True})


@app.post("/api/index")
async def index_doc(doc_id: uuid.UUID, filename: str = ""):
    doc_id = str(doc_id)
    filepath = UPLOAD_DIR / f"{doc_id}.pdf"
    if not filepath.is_file():
        return JSONResponse({"error": "Document not found"}, status_code=404)

    if not filename:
        filename = os.path.basename(filepath)

    try:
        count = await run_in_threadpool(index_document, str(filepath), filename, doc_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from None
    except Exception:
        raise HTTPException(503, "Could not index the PDF. Check the file and service configuration.") from None
    return JSONResponse({"doc_id": doc_id, "chunks_count": count, "success": True})


@app.post("/api/query")
async def query(req: QueryRequest):
    try:
        result = await query_document(req.question, str(req.doc_id), req.top_k)
    except Exception:
        raise HTTPException(503, "The answer service is unavailable. Please try again later.") from None
    return JSONResponse(result)
