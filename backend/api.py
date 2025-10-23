"""
Loom Lite Unified API
Combines ontology query endpoints and N8N ingestion endpoints
"""
import os
import sqlite3
import json
import uuid
import hashlib
import base64
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

# Import modules
from models import MicroOntology, DocumentMetadata, OntologyVersion, Span, Concept, Relation, Mention
from reader import read_document
from extractor import extract_ontology

app = FastAPI(
    title="Loom Lite Unified API",
    version="1.0.0",
    description="Ontology query and N8N ingestion endpoints"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "loom_lite_v2.db")

# Job storage (in-memory for now, use Redis/DB for production)
jobs = {}

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class IngestRequest(BaseModel):
    file: str  # base64 encoded
    filename: str
    title: Optional[str] = None

class JobStatus(BaseModel):
    job_id: str
    status: str  # queued, processing, completed, failed
    doc_id: Optional[str] = None
    progress: Optional[str] = None
    concepts_count: Optional[int] = None
    relations_count: Optional[int] = None
    error: Optional[str] = None

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_ontology_from_db(doc_id: str) -> Optional[MicroOntology]:
    """Retrieve MicroOntology from database"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get document
    cur.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc_row = cur.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not doc_row:
        return None
    
    doc = DocumentMetadata(**dict(doc_row))
    
    # Get version
    version_row = cur.execute(
        "SELECT * FROM ontology_versions WHERE doc_id = ? ORDER BY extracted_at DESC LIMIT 1",
        (doc_id,)
    ).fetchone()
    version = OntologyVersion(**dict(version_row)) if version_row else None
    
    # Get spans
    spans = [Span(**dict(row)) for row in cur.execute(
        "SELECT * FROM spans WHERE doc_id = ?", (doc_id,)
    ).fetchall()]
    
    # Get concepts
    concepts = [Concept(**dict(row)) for row in cur.execute(
        "SELECT * FROM concepts WHERE doc_id = ?", (doc_id,)
    ).fetchall()]
    
    # Get relations
    relations = [Relation(**dict(row)) for row in cur.execute(
        "SELECT * FROM relations WHERE doc_id = ?", (doc_id,)
    ).fetchall()]
    
    # Get mentions
    mentions = [Mention(**dict(row)) for row in cur.execute(
        "SELECT * FROM mentions WHERE doc_id = ?", (doc_id,)
    ).fetchall()]
    
    conn.close()
    
    return MicroOntology(
        doc=doc,
        version=version,
        spans=spans,
        concepts=concepts,
        relations=relations,
        mentions=mentions
    )

def process_ingestion(job_id: str, file_bytes: bytes, filename: str, title: Optional[str]):
    """Background task to process document ingestion"""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = "Reading document..."
        
        # Read document
        text = read_document(file_bytes, filename)
        
        jobs[job_id]["progress"] = "Extracting ontology..."
        
        # Extract ontology
        ontology = extract_ontology(text, filename, title)
        
        jobs[job_id]["progress"] = "Storing results..."
        
        # Store in database
        conn = get_db()
        cur = conn.cursor()
        
        # Insert document
        cur.execute("""
            INSERT INTO documents (id, title, filename, bytes, checksum, created_at, modified_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            ontology.doc.id,
            ontology.doc.title,
            ontology.doc.filename,
            ontology.doc.bytes,
            ontology.doc.checksum,
            ontology.doc.created_at,
            ontology.doc.modified_at
        ))
        
        # Insert version
        if ontology.version:
            cur.execute("""
                INSERT INTO ontology_versions (id, doc_id, model, pipeline, extracted_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                ontology.version.id,
                ontology.version.doc_id,
                ontology.version.model,
                ontology.version.pipeline,
                ontology.version.extracted_at
            ))
        
        # Insert spans, concepts, relations, mentions
        for span in ontology.spans:
            cur.execute("""
                INSERT INTO spans (id, doc_id, start, end, text, page, quality)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (span.id, span.doc_id, span.start, span.end, span.text, span.page, span.quality))
        
        for concept in ontology.concepts:
            cur.execute("""
                INSERT INTO concepts (id, doc_id, name, type, confidence, aliases, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (concept.id, concept.doc_id, concept.name, concept.type, concept.confidence,
                  json.dumps(concept.aliases) if concept.aliases else None,
                  json.dumps(concept.tags) if concept.tags else None))
        
        for relation in ontology.relations:
            cur.execute("""
                INSERT INTO relations (id, doc_id, src_concept_id, rel, dst_concept_id, confidence)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (relation.id, relation.doc_id, relation.src_concept_id, relation.rel,
                  relation.dst_concept_id, relation.confidence))
        
        for mention in ontology.mentions:
            cur.execute("""
                INSERT INTO mentions (id, doc_id, concept_id, span_id, confidence)
                VALUES (?, ?, ?, ?, ?)
            """, (mention.id, mention.doc_id, mention.concept_id, mention.span_id, mention.confidence))
        
        conn.commit()
        conn.close()
        
        # Update job status
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["doc_id"] = ontology.doc.id
        jobs[job_id]["concepts_count"] = len(ontology.concepts)
        jobs[job_id]["relations_count"] = len(ontology.relations)
        jobs[job_id]["progress"] = "Done"
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

# ============================================================================
# ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """API info"""
    return {
        "name": "Loom Lite Unified API",
        "version": "1.0.0",
        "endpoints": {
            "ontology_query": {
                "tree": "/tree",
                "search": "/search?q=query&types=Metric,Date",
                "doc_ontology": "/doc/{doc_id}/ontology",
                "jump": "/jump?doc_id=xxx&concept_id=yyy",
                "concepts": "/concepts?types=Metric,Date",
                "tags": "/tags"
            },
            "n8n_ingestion": {
                "ingest": "POST /api/ingest",
                "job_status": "GET /api/jobs/{job_id}",
                "list_jobs": "GET /api/jobs"
            }
        }
    }

# ----------------------------------------------------------------------------
# ONTOLOGY QUERY ENDPOINTS
# ----------------------------------------------------------------------------

@app.get("/tree")
async def get_tree():
    """Get document tree"""
    conn = get_db()
    docs = conn.execute("SELECT id, title, filename FROM documents ORDER BY created_at DESC").fetchall()
    conn.close()
    return {"documents": [dict(d) for d in docs]}

@app.get("/doc/{doc_id}/ontology")
async def get_doc_ontology(doc_id: str):
    """Get full MicroOntology for a document"""
    ontology = get_ontology_from_db(doc_id)
    if not ontology:
        raise HTTPException(status_code=404, detail="Document not found")
    return ontology.dict()

@app.get("/search")
async def search(q: str = "", types: str = "", tags: str = ""):
    """Search concepts"""
    conn = get_db()
    query = "SELECT * FROM concepts WHERE 1=1"
    params = []
    
    if q:
        query += " AND name LIKE ?"
        params.append(f"%{q}%")
    
    if types:
        type_list = types.split(",")
        query += f" AND type IN ({','.join(['?']*len(type_list))})"
        params.extend(type_list)
    
    results = conn.execute(query, params).fetchall()
    conn.close()
    
    return {"concepts": [dict(r) for r in results]}

@app.get("/jump")
async def jump(doc_id: str, concept_id: str):
    """Get evidence spans for a concept"""
    conn = get_db()
    mentions = conn.execute("""
        SELECT m.*, s.text, s.start, s.end, s.page
        FROM mentions m
        JOIN spans s ON m.span_id = s.id
        WHERE m.doc_id = ? AND m.concept_id = ?
    """, (doc_id, concept_id)).fetchall()
    conn.close()
    
    return {"evidence": [dict(m) for m in mentions]}

@app.get("/concepts")
async def get_concepts(types: str = ""):
    """Get all concepts, optionally filtered by type"""
    conn = get_db()
    if types:
        type_list = types.split(",")
        query = f"SELECT * FROM concepts WHERE type IN ({','.join(['?']*len(type_list))})"
        results = conn.execute(query, type_list).fetchall()
    else:
        results = conn.execute("SELECT * FROM concepts").fetchall()
    conn.close()
    
    return {"concepts": [dict(r) for r in results]}

@app.get("/tags")
async def get_tags():
    """Get all unique tags"""
    conn = get_db()
    concepts = conn.execute("SELECT tags FROM concepts WHERE tags IS NOT NULL").fetchall()
    conn.close()
    
    all_tags = set()
    for row in concepts:
        if row["tags"]:
            tags = json.loads(row["tags"])
            all_tags.update(tags)
    
    return {"tags": sorted(list(all_tags))}

# ----------------------------------------------------------------------------
# N8N INGESTION ENDPOINTS
# ----------------------------------------------------------------------------

@app.post("/api/ingest")
async def ingest_document(request: IngestRequest, background_tasks: BackgroundTasks):
    """Ingest a document for ontology extraction"""
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    # Decode base64 file
    try:
        file_bytes = base64.b64decode(request.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 encoding: {str(e)}")
    
    # Create job
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "filename": request.filename,
        "title": request.title,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Start background processing
    background_tasks.add_task(process_ingestion, job_id, file_bytes, request.filename, request.title)
    
    return {"job_id": job_id, "status": "queued"}

@app.post("/api/ingest/file")
async def ingest_file(background_tasks: BackgroundTasks, file: UploadFile = File(...), title: Optional[str] = None):
    """Ingest a document via file upload"""
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    # Read file
    file_bytes = await file.read()
    
    # Create job
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "filename": file.filename,
        "title": title or file.filename,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Start background processing
    background_tasks.add_task(process_ingestion, job_id, file_bytes, file.filename, title)
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatus(**jobs[job_id])

@app.get("/api/jobs")
async def list_jobs():
    """List all jobs"""
    return {"jobs": list(jobs.values())}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

