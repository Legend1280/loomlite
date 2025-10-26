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
from models import MicroOntology, DocumentMetadata, OntologyVersion, Span, Concept, Relation, MentionLink
from reader import read_document
from extractor import extract_ontology_from_text, store_ontology

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

# Database path - use /data volume for persistence on Railway
DB_DIR = os.getenv("DB_DIR", "/data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")

# Job storage (in-memory for now, use Redis/DB for production)
jobs = {}

# ============================================================================
# DATABASE INITIALIZATION
# ============================================================================

def init_database():
    """Initialize database with schema if it doesn't exist"""
    schema_path = os.path.join(os.path.dirname(__file__), "schema_v2.sql")
    
    # Check if database exists and has tables
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
        if cur.fetchone():
            conn.close()
            print(f"Database already initialized at {DB_PATH}")
            return
        conn.close()
    
    # Initialize database
    print(f"Initializing database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    with open(schema_path, 'r') as f:
        conn.executescript(f.read())
    conn.commit()
    conn.close()
    print("Database initialized successfully")

# Initialize on startup
init_database()

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
    mentions = [MentionLink(**dict(row)) for row in cur.execute(
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
    import tempfile
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["progress"] = "Reading document..."
        
        # Save file to temp location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        
        # Read document
        doc_data = read_document(tmp_path)
        
        # Generate doc_id from checksum
        doc_id = f"doc_{hashlib.sha256(doc_data['checksum'].encode()).hexdigest()[:12]}"
        
        if not title:
            title = filename
        
        jobs[job_id]["progress"] = "Extracting ontology..."
        
        # Extract ontology
        ontology = extract_ontology_from_text(doc_data["text"], doc_id)
        
        jobs[job_id]["progress"] = "Storing results..."
        
        # Store in database
        version_id = store_ontology(
            doc_id=doc_id,
            title=title,
            source_uri=filename,
            mime=doc_data["mime"],
            checksum=doc_data["checksum"],
            file_bytes=doc_data["bytes"],
            ontology=ontology
        )
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Update job status
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["doc_id"] = doc_id
        jobs[job_id]["concepts_count"] = len(ontology["concepts"])
        jobs[job_id]["relations_count"] = len(ontology["relations"])
        jobs[job_id]["progress"] = "Done"
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        import traceback
        jobs[job_id]["traceback"] = traceback.format_exc()

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
    docs = conn.execute("SELECT id, title, source_uri, created_at FROM documents ORDER BY created_at DESC").fetchall()
    conn.close()
    # Return array with type='file' for frontend compatibility
    return [{**dict(d), "type": "file"} for d in docs]

@app.get("/doc/{doc_id}/ontology")
async def get_doc_ontology(doc_id: str):
    """Get full MicroOntology for a document"""
    try:
        ontology = get_ontology_from_db(doc_id)
        if not ontology:
            raise HTTPException(status_code=404, detail="Document not found")
        return ontology.dict()
    except Exception as e:
        # Fallback: return simplified structure
        conn = get_db()
        doc = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        
        concepts = conn.execute("SELECT * FROM concepts WHERE doc_id = ?", (doc_id,)).fetchall()
        relations = conn.execute("SELECT * FROM relations WHERE doc_id = ?", (doc_id,)).fetchall()
        conn.close()
        
        return {
            "document": dict(doc),
            "concepts": [dict(c) for c in concepts],
            "relations": [dict(r) for r in relations]
        }

@app.get("/doc/{doc_id}/text")
async def get_doc_text(doc_id: str):
    """Get document text with spans for highlighting"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get document metadata
    doc_row = cur.execute("SELECT id, title, checksum, text FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not doc_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = dict(doc_row)
    
    # Get spans for highlighting
    spans = cur.execute(
        "SELECT s.id, s.start, s.end, s.text, m.concept_id FROM spans s LEFT JOIN mentions m ON s.id = m.span_id WHERE s.doc_id = ? ORDER BY s.start",
        (doc_id,)
    ).fetchall()
    
    conn.close()
    
    return {
        "doc_id": doc["id"],
        "title": doc["title"],
        "checksum": doc["checksum"],
        "text": doc.get("text", ""),
        "spans": [{"id": s["id"], "start": s["start"], "end": s["end"], "text": s["text"], "concept_id": s["concept_id"]} for s in spans]
    }

@app.get("/search")
async def search(q: str = "", types: str = "", tags: str = ""):
    """Search concepts"""
    conn = get_db()
    query = "SELECT * FROM concepts WHERE 1=1"
    params = []
    
    if q:
        query += " AND label LIKE ?"
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

@app.get("/admin/migrate")
async def run_migration():
    """Run database migration to add text column (safe, idempotent)"""
    try:
        conn = get_db()
        
        # Check if text column already exists
        cursor = conn.execute("PRAGMA table_info(documents)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'text' in columns:
            conn.close()
            return {
                "status": "already_migrated",
                "message": "Text column already exists, no migration needed"
            }
        
        # Add text column
        conn.execute("ALTER TABLE documents ADD COLUMN text TEXT")
        conn.commit()
        
        # Reconstruct text from spans for existing documents
        docs = conn.execute("SELECT id FROM documents WHERE text IS NULL").fetchall()
        migrated_count = 0
        
        for (doc_id,) in docs:
            spans = conn.execute(
                "SELECT text FROM spans WHERE doc_id = ? ORDER BY start",
                (doc_id,)
            ).fetchall()
            
            if spans:
                full_text = " ".join([s[0] for s in spans])
                conn.execute(
                    "UPDATE documents SET text = ? WHERE id = ?",
                    (full_text, doc_id)
                )
                migrated_count += 1
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Migration completed successfully. Added text column and migrated {migrated_count} documents.",
            "migrated_documents": migrated_count
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/admin/migrate-hierarchy")
async def migrate_hierarchy():
    """
    Run database migration to add semantic hierarchy columns
    Safe to run multiple times - will skip if columns already exist
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if migration already done
        cursor.execute("PRAGMA table_info(concepts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        already_migrated = all([
            'parent_cluster_id' in columns,
            'hierarchy_level' in columns,
            'coherence' in columns
        ])
        
        if already_migrated:
            conn.close()
            return {
                "status": "already_migrated",
                "message": "Hierarchy columns already exist, no migration needed",
                "columns": columns
            }
        
        # Run migration
        results = []
        
        # Add parent_cluster_id column
        if 'parent_cluster_id' not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN parent_cluster_id TEXT")
            results.append("✅ Added parent_cluster_id column")
        
        # Add hierarchy_level column
        if 'hierarchy_level' not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN hierarchy_level INTEGER DEFAULT 3")
            results.append("✅ Added hierarchy_level column")
        
        # Add coherence column
        if 'coherence' not in columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN coherence REAL")
            results.append("✅ Added coherence column")
        
        # Create index for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_concepts_parent 
            ON concepts(parent_cluster_id)
        """)
        results.append("✅ Created index on parent_cluster_id")
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": "Migration completed successfully!",
            "changes": results,
            "next_steps": "Upload a document to test semantic hierarchy extraction"
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

@app.get("/admin/migrate-parent-concept-id")
async def migrate_parent_concept_id():
    """
    Run database migration to add parent_concept_id column for intra-cluster hierarchy (v2.3.2)
    Safe to run multiple times - will skip if column already exists
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if migration already done
        cursor.execute("PRAGMA table_info(concepts)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'parent_concept_id' in columns:
            conn.close()
            return {
                "status": "already_migrated",
                "message": "parent_concept_id column already exists, no migration needed",
                "columns": columns
            }
        
        # Run migration
        results = []
        
        # Add parent_concept_id column
        cursor.execute("ALTER TABLE concepts ADD COLUMN parent_concept_id TEXT")
        results.append("✅ Added parent_concept_id column")
        
        # Create index for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_concepts_parent_concept 
            ON concepts(parent_concept_id)
        """)
        results.append("✅ Created index on parent_concept_id")
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": "Migration completed successfully! Intra-cluster hierarchy enabled.",
            "changes": results,
            "next_steps": "Upload a document to test refinement node creation"
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# Trigger redeploy
