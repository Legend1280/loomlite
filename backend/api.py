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
from semantic_folders import build_semantic_folders, get_saved_views, create_saved_view, delete_saved_view
from analytics import track_folder_view, track_pin_event, update_dwell_time, get_folder_stats, get_document_stats, get_trending_documents
from file_system import get_top_hits, get_pinned_folders, get_standard_folder, get_standard_folders_by_type, get_standard_folders_by_date, get_semantic_folder

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
        
        jobs[job_id]["progress"] = "Generating summaries..."
        
        # Generate summaries for document hierarchy (ONTOLOGY_STANDARD v1.4-preview)
        # Unified summarization: 1 API call instead of 4+ (Reflective Layer Enhancement)
        try:
            from summarizer_unified import summarize_document_hierarchy_unified
            conn = get_db()
            
            # Fetch concepts WITH database IDs (needed for summary updates)
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, label, hierarchy_level, parent_concept_id, parent_cluster_id FROM concepts WHERE doc_id = ?",
                (doc_id,)
            )
            concepts_with_ids = [
                {
                    "id": row[0],
                    "label": row[1],
                    "hierarchy_level": row[2],
                    "parent_concept_id": row[3],
                    "parent_cluster_id": row[4]
                }
                for row in cursor.fetchall()
            ]
            
            result = summarize_document_hierarchy_unified(
                doc_id=doc_id,
                doc_text=doc_data["text"],
                doc_title=title,
                concepts=concepts_with_ids,
                db_conn=conn
            )
            conn.close()
            print(f"✅ Unified summarization result: {result}")
        except Exception as e:
            print(f"⚠️  Summarization failed: {e}")
            import traceback
            traceback.print_exc()
        
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
            },
            "diagnostics": {
                "health": "GET /api/health"
            }
        }
    }

@app.get("/api/health")
async def health_check():
    """Diagnostic endpoint to check system health and OpenAI API key status"""
    api_key = os.getenv("OPENAI_API_KEY")
    
    health_status = {
        "status": "healthy",
        "database": os.path.exists(DB_PATH),
        "database_path": DB_PATH,
        "openai_api_key_set": api_key is not None,
        "openai_api_key_length": len(api_key) if api_key else 0,
        "openai_api_key_preview": f"...{api_key[-4:]}" if api_key and len(api_key) > 4 else None
    }
    
    # Test OpenAI connection if key is set
    if api_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[{"role": "user", "content": "test"}],
                max_tokens=5
            )
            health_status["openai_connection"] = "success"
            health_status["openai_model"] = response.model
        except Exception as e:
            health_status["openai_connection"] = "failed"
            health_status["openai_error"] = str(e)
    else:
        health_status["openai_connection"] = "api_key_not_set"
    
    return health_status

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

@app.get("/admin/migrate-summary")
async def migrate_summary():
    """
    Run database migration to add summary columns for v1.2 (ONTOLOGY_STANDARD v1.2)
    Safe to run multiple times - will skip if columns already exist
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if migration already done
        cursor.execute("PRAGMA table_info(documents)")
        doc_columns = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(concepts)")
        concept_columns = [col[1] for col in cursor.fetchall()]
        
        if 'summary' in doc_columns and 'summary' in concept_columns:
            conn.close()
            return {
                "status": "already_migrated",
                "message": "summary columns already exist, no migration needed"
            }
        
        # Run migration
        results = []
        
        # Add summary to documents table
        if 'summary' not in doc_columns:
            cursor.execute("ALTER TABLE documents ADD COLUMN summary TEXT")
            results.append("✅ Added summary column to documents table")
        
        # Add summary to concepts table
        if 'summary' not in concept_columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN summary TEXT")
            results.append("✅ Added summary column to concepts table")
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": "Migration completed successfully! Document summarization enabled.",
            "changes": results,
            "next_steps": "Upload a new document to test summary generation"
        }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }

# ============================================================================
# SEMANTIC FOLDERS ENDPOINTS (v3.2)
# ============================================================================

@app.get("/semantic-folders")
def get_semantic_folders(
    query: Optional[str] = None,
    sort: str = "auto"
):
    """
    Generate virtual folders based on query and sort mode
    
    Args:
        query: Search term to filter concepts/documents
        sort: Sort mode - "auto" (default), "alphabetical", or "recency"
    
    Returns:
        Folder structure with items sorted by the specified mode
    """
    try:
        conn = get_db()
        result = build_semantic_folders(conn, query=query, sort_mode=sort)
        conn.close()
        return result
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail={
            "error": str(e),
            "traceback": traceback.format_exc()
        })


@app.get("/saved-views")
def list_saved_views(user_id: Optional[str] = None):
    """
    Get all saved views for a user
    
    Args:
        user_id: Optional user ID to filter views
    
    Returns:
        List of saved views
    """
    try:
        conn = get_db()
        views = get_saved_views(conn, user_id=user_id)
        conn.close()
        return {"views": views}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CreateSavedViewRequest(BaseModel):
    view_name: str
    query: str
    sort_mode: str = "auto"
    user_id: Optional[str] = None


@app.post("/saved-views")
def create_new_saved_view(request: CreateSavedViewRequest):
    """
    Create a new saved view
    
    Args:
        request: View creation request with name, query, and sort mode
    
    Returns:
        Created view with ID and timestamp
    """
    try:
        conn = get_db()
        view = create_saved_view(
            conn,
            view_name=request.view_name,
            query=request.query,
            sort_mode=request.sort_mode,
            user_id=request.user_id
        )
        conn.close()
        return view
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/saved-views/{view_id}")
def remove_saved_view(view_id: str):
    """
    Delete a saved view
    
    Args:
        view_id: ID of the view to delete
    
    Returns:
        Success status
    """
    try:
        conn = get_db()
        success = delete_saved_view(conn, view_id)
        conn.close()
        
        if not success:
            raise HTTPException(status_code=404, detail="View not found")
        
        return {"status": "success", "message": "View deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/semantic-folders/{view_id}")
def get_semantic_folders_by_view(view_id: str):
    """
    Get semantic folders for a saved view
    
    Args:
        view_id: ID of the saved view
    
    Returns:
        Folder structure based on the saved view's query and sort mode
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Get the saved view
        cur.execute(
            "SELECT query, sort_mode FROM saved_views WHERE id = ?",
            (view_id,)
        )
        row = cur.fetchone()
        
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="View not found")
        
        query, sort_mode = row
        
        # Build folders using the saved view's parameters
        result = build_semantic_folders(conn, query=query, sort_mode=sort_mode)
        result["view_id"] = view_id
        
        conn.close()
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail={
            "error": str(e),
            "traceback": traceback.format_exc()
        })


# ============================================================================
# Analytics Endpoints (v3.3)
# ============================================================================

@app.post("/analytics/track-view")
def track_view(folder_name: str, doc_id: str):
    """
    Track a folder/document view event
    Increments view_count and updates last_opened
    """
    try:
        conn = get_db()
        track_folder_view(conn, folder_name, doc_id)
        return {"status": "success", "message": "View tracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/track-pin")
def track_pin(folder_name: str, doc_id: str):
    """
    Track a pin event for a folder/document
    Increments pin_count
    """
    try:
        conn = get_db()
        track_pin_event(conn, folder_name, doc_id)
        return {"status": "success", "message": "Pin tracked"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/track-dwell")
def track_dwell(folder_name: str, doc_id: str, seconds: int):
    """
    Update dwell time for a folder/document
    Adds to existing dwell_time
    """
    try:
        conn = get_db()
        update_dwell_time(conn, folder_name, doc_id, seconds)
        return {"status": "success", "message": "Dwell time updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/folder-stats")
def folder_stats(folder_name: Optional[str] = None):
    """
    Get analytics summary for folders
    If folder_name is provided, returns stats for that folder only
    """
    try:
        conn = get_db()
        stats = get_folder_stats(conn, folder_name)
        return {"stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/document-stats/{doc_id}")
def document_stats(doc_id: str):
    """
    Get analytics for a specific document across all folders
    """
    try:
        conn = get_db()
        stats = get_document_stats(conn, doc_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending-documents")
def trending_documents(limit: int = 10):
    """
    Get trending documents based on recent views and engagement
    """
    try:
        conn = get_db()
        trending = get_trending_documents(conn, limit)
        return {"trending": trending}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# FILE SYSTEM ENDPOINTS (v4.0)
# ============================================================================

@app.get("/api/files/top-hits")
def api_top_hits(limit: int = 6):
    """
    Get top hits based on dwell time, recency, and frequency
    """
    try:
        conn = get_db()
        top_hits = get_top_hits(conn, limit)
        return {"top_hits": top_hits}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/pinned")
def api_pinned_folders(user_id: str = "default"):
    """
    Get user-pinned folders and documents
    """
    try:
        conn = get_db()
        pinned = get_pinned_folders(conn, user_id)
        return {"pinned": pinned}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/folders/{folder_type}")
def api_standard_folder(folder_type: str):
    """
    Get standard folder contents (recent, favorites, etc.)
    """
    try:
        conn = get_db()
        
        if folder_type == "by-type":
            folders = get_standard_folders_by_type(conn)
            return {"folders": folders}
        elif folder_type == "by-date":
            folders = get_standard_folders_by_date(conn)
            return {"folders": folders}
        else:
            folder = get_standard_folder(conn, folder_type)
            return folder
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/semantic/{category}")
def api_semantic_folder(category: str):
    """
    Get semantic folder contents based on ontology
    Categories: projects, concepts, financial, research, ai_tech
    """
    try:
        conn = get_db()
        folder = get_semantic_folder(conn, category)
        return folder
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/sort-weights")
def get_sort_weights():
    """
    Get current adaptive sort weights
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT weight_confidence, weight_relation, weight_recency, weight_hierarchy, updated_at, notes
            FROM sort_weights
            WHERE id = 'default'
        """)
        row = cur.fetchone()
        
        if row:
            w1, w2, w3, w4, updated_at, notes = row
            return {
                "weights": {
                    "confidence": 0.5 + (w1 or 0.0),
                    "relation": 0.2 + (w2 or 0.0),
                    "recency": 0.2 + (w3 or 0.0),
                    "hierarchy": 0.1 + (w4 or 0.0)
                },
                "adjustments": {
                    "weight_confidence": w1 or 0.0,
                    "weight_relation": w2 or 0.0,
                    "weight_recency": w3 or 0.0,
                    "weight_hierarchy": w4 or 0.0
                },
                "base_weights": {
                    "confidence": 0.5,
                    "relation": 0.2,
                    "recency": 0.2,
                    "hierarchy": 0.1
                },
                "updated_at": updated_at,
                "notes": notes
            }
        else:
            return {
                "weights": {
                    "confidence": 0.5,
                    "relation": 0.2,
                    "recency": 0.2,
                    "hierarchy": 0.1
                },
                "message": "Using default weights (sort_weights table not initialized)"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/sort-weights")
def update_sort_weights(
    weight_confidence: float = 0.0,
    weight_relation: float = 0.0,
    weight_recency: float = 0.0,
    weight_hierarchy: float = 0.0,
    notes: Optional[str] = None
):
    """
    Update adaptive sort weights
    These are adjustments added to base weights (0.5, 0.2, 0.2, 0.1)
    """
    try:
        conn = get_db()
        cur = conn.cursor()
        now = datetime.now().isoformat()
        
        # Check if default weights exist
        cur.execute("SELECT COUNT(*) FROM sort_weights WHERE id = 'default'")
        exists = cur.fetchone()[0] > 0
        
        if exists:
            # Update existing
            cur.execute("""
                UPDATE sort_weights
                SET weight_confidence = ?,
                    weight_relation = ?,
                    weight_recency = ?,
                    weight_hierarchy = ?,
                    updated_at = ?,
                    notes = ?
                WHERE id = 'default'
            """, (weight_confidence, weight_relation, weight_recency, weight_hierarchy, now, notes))
        else:
            # Insert new
            cur.execute("""
                INSERT INTO sort_weights (
                    id, weight_confidence, weight_relation, weight_recency, weight_hierarchy, updated_at, notes
                ) VALUES ('default', ?, ?, ?, ?, ?, ?)
            """, (weight_confidence, weight_relation, weight_recency, weight_hierarchy, now, notes))
        
        conn.commit()
        
        return {
            "status": "success",
            "message": "Sort weights updated",
            "weights": {
                "confidence": 0.5 + weight_confidence,
                "relation": 0.2 + weight_relation,
                "recency": 0.2 + weight_recency,
                "hierarchy": 0.1 + weight_hierarchy
            },
            "updated_at": now
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Admin Endpoints
# ============================================================================

@app.post("/admin/run-migration")
def run_migration():
    """
    Run database migrations
    Creates the saved_views and folder_stats tables if they don't exist
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        
        tables_created = []
        
        # Check and create saved_views table
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_views'")
        if not cur.fetchone():
            cur.execute("""
                CREATE TABLE saved_views (
                    id TEXT PRIMARY KEY,
                    view_name TEXT NOT NULL,
                    query TEXT NOT NULL,
                    sort_mode TEXT DEFAULT 'auto',
                    created_at TEXT NOT NULL,
                    user_id TEXT
                )
            """)
            cur.execute("CREATE INDEX idx_saved_views_user ON saved_views(user_id)")
            tables_created.append("saved_views")
        
        # Check and create folder_stats table
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='folder_stats'")
        if not cur.fetchone():
            cur.execute("""
                CREATE TABLE folder_stats (
                    id TEXT PRIMARY KEY,
                    folder_name TEXT NOT NULL,
                    doc_id TEXT NOT NULL,
                    view_count INTEGER DEFAULT 0,
                    pin_count INTEGER DEFAULT 0,
                    last_opened TEXT,
                    dwell_time INTEGER DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
                )
            """)
            cur.execute("CREATE INDEX idx_folder_stats_folder ON folder_stats(folder_name)")
            cur.execute("CREATE INDEX idx_folder_stats_doc ON folder_stats(doc_id)")
            cur.execute("CREATE INDEX idx_folder_stats_updated ON folder_stats(updated_at DESC)")
            tables_created.append("folder_stats")
        
        # Check and create sort_weights table
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sort_weights'")
        if not cur.fetchone():
            cur.execute("""
                CREATE TABLE sort_weights (
                    id TEXT PRIMARY KEY,
                    weight_confidence REAL DEFAULT 0.0,
                    weight_relation REAL DEFAULT 0.0,
                    weight_recency REAL DEFAULT 0.0,
                    weight_hierarchy REAL DEFAULT 0.0,
                    updated_at TEXT NOT NULL,
                    notes TEXT
                )
            """)
            # Insert default weights
            now = datetime.now().isoformat()
            cur.execute("""
                INSERT INTO sort_weights (
                    id, weight_confidence, weight_relation, weight_recency, weight_hierarchy, updated_at, notes
                ) VALUES (
                    'default', 0.0, 0.0, 0.0, 0.0, ?, 'Initial default weights'
                )
            """, (now,))
            tables_created.append("sort_weights")
        
        conn.commit()
        conn.close()
        
        if tables_created:
            return {
                "status": "success",
                "message": f"Created tables: {', '.join(tables_created)}",
                "action": "created_tables",
                "tables": tables_created
            }
        else:
            return {
                "status": "success",
                "message": "All tables already exist",
                "action": "none"
            }
        
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }


@app.post("/admin/clear-all")
def clear_all_data():
    """
    Clear all documents, concepts, relations, and spans from the database.
    WARNING: This is destructive and cannot be undone!
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get counts before deletion
        cursor.execute("SELECT COUNT(*) FROM documents")
        doc_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM concepts")
        concept_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM relations")
        relation_count = cursor.fetchone()[0]
        
        # Delete all data
        cursor.execute("DELETE FROM mentions")
        cursor.execute("DELETE FROM relations")
        cursor.execute("DELETE FROM concepts")
        cursor.execute("DELETE FROM spans")
        cursor.execute("DELETE FROM ontology_versions")
        cursor.execute("DELETE FROM documents")
        
        conn.commit()
        conn.close()
        
        # Clear in-memory job storage
        global jobs
        jobs = {}
        
        return {
            "status": "success",
            "message": "All data cleared successfully",
            "deleted": {
                "documents": doc_count,
                "concepts": concept_count,
                "relations": relation_count
            }
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
# Railway rebuild trigger - Sun Oct 26 14:54:36 EDT 2025
