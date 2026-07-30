import os
import uuid
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, HTMLResponse, FileResponse
from pydantic import BaseModel

from chain import index_document, query_document

app = FastAPI(title="DocAssistant")

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

TEMPLATES_DIR = Path("templates")


def render(name: str) -> str:
    return (TEMPLATES_DIR / name).read_text(encoding="utf-8")


class QueryRequest(BaseModel):
    doc_id: str
    question: str
    top_k: int = 5


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

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return JSONResponse({"doc_id": doc_id, "filename": file.filename, "success": True})


@app.post("/api/index")
async def index_doc(doc_id: str, filename: str = ""):
    ext_candidates = list(UPLOAD_DIR.glob(f"{doc_id}.*"))
    if not ext_candidates:
        return JSONResponse({"error": "Document not found"}, status_code=404)

    filepath = str(ext_candidates[0])
    if not filename:
        filename = os.path.basename(filepath)

    count = index_document(filepath, filename, doc_id)
    return JSONResponse({"doc_id": doc_id, "chunks_count": count, "success": True})


@app.post("/api/query")
async def query(req: QueryRequest):
    result = await query_document(req.question, req.doc_id, req.top_k)
    return JSONResponse(result)
