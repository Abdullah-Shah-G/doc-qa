import os
from pathlib import Path
from dotenv import load_dotenv
from pypdf import PdfReader
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    api_key=api_key,
    max_output_tokens=512,
    temperature=0.1,
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    google_api_key=api_key,
)

VECTOR_STORE_DIR = Path("vector_store")
VECTOR_STORE_DIR.mkdir(exist_ok=True)

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

SYSTEM_PROMPT = """You are DocAssistant. Use ONLY the retrieved context passages to answer the user's question. If the retrieved context does not contain enough information to answer, say: "I don't have enough information in the documents to answer that." When you answer, include inline citations after each claim in the form [source: <filename>#page:<n>]. Keep the answer concise and provide a short summary and optionally a bulleted list of sources. Do not hallucinate."""


def load_vector_store(doc_id: str) -> FAISS | None:
    path = VECTOR_STORE_DIR / doc_id
    if path.exists():
        return FAISS.load_local(str(path), embeddings, allow_dangerous_deserialization=True)
    return None


def save_vector_store(vs: FAISS, doc_id: str):
    path = VECTOR_STORE_DIR / doc_id
    vs.save_local(str(path))


def parse_pdf(filepath: str) -> list[dict]:
    reader = PdfReader(filepath)
    pages = []
    for i, page in enumerate(reader.pages, 1):
        text = page.extract_text()
        if text.strip():
            pages.append({"page": i, "text": text})
    return pages


def index_document(filepath: str, filename: str, doc_id: str) -> int:
    pages = parse_pdf(filepath)
    docs = []
    for p in pages:
        chunks = text_splitter.split_text(p["text"])
        for chunk in chunks:
            docs.append(Document(
                page_content=chunk,
                metadata={"filename": filename, "page": p["page"], "doc_id": doc_id},
            ))

    vs = FAISS.from_documents(docs, embeddings)
    save_vector_store(vs, doc_id)
    return len(docs)


async def query_document(question: str, doc_id: str, top_k: int = 5) -> dict:
    vs = load_vector_store(doc_id)
    if not vs:
        return {"answer": "No documents have been indexed yet.", "sources": [], "confidence": "low", "chunks": []}

    docs_with_scores = vs.similarity_search_with_score(question, k=top_k)
    retrieved = [doc for doc, _ in docs_with_scores]
    scores = [float(s) for _, s in docs_with_scores]

    if not retrieved:
        return {"answer": "No relevant information found.", "sources": [], "confidence": "low", "chunks": []}

    context_parts = []
    for i, doc in enumerate(retrieved, 1):
        meta = doc.metadata
        context_parts.append(f"[Context {i}] {doc.page_content}\n[source: {meta['filename']}#page:{meta['page']}]")
    context = "\n\n".join(context_parts)

    user_prompt = f"Using only the context above, answer: {question}"
    full_prompt = f"Context:\n{context}\n\n{user_prompt}"

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": full_prompt},
    ]

    result = await llm.ainvoke(messages)
    content = result.content
    if isinstance(content, list):
        content = "".join(c.get("text", "") for c in content)
    answer = content.strip() or "I couldn't generate an answer."

    sources = []
    for doc in retrieved:
        meta = doc.metadata
        sources.append({"filename": meta["filename"], "page": meta["page"]})

    if "[source:" in answer and len(answer) > 50:
        confidence = "high"
    elif "I don't have enough information" in answer:
        confidence = "low"
    else:
        confidence = "medium"

    chunks = [doc.page_content[:200] + "..." for doc in retrieved]

    return {"answer": answer, "sources": sources, "confidence": confidence, "chunks": chunks}
