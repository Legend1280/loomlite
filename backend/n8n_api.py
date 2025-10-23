"""
N8N Integration API
Provides endpoints for automated document ingestion and job tracking
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import sqlite3
import json
import base64
import tempfile
import os
from datetime import datetime
import uuid

from extractor import extract_and_store

app = FastAPI(title="Loom Lite N8N API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "/home/ubuntu/loom-lite-mvp/backend/loom_lite_v2.db"
JOBS_DB = "/home/ubuntu/loom-lite-mvp/backend/jobs.db"

# Initialize jobs database
def init_jobs_db():
    conn = sqlite3.connect(JOBS_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            doc_id TEXT,
            status TEXT,
            progress REAL,
            concepts_extracted INTEGER,
            relations_extracted INTEGER,
            error TEXT,
            created_at TEXT,
            updated_at TEXT
        )
    """)
    conn.commit()
    conn.close()

init_jobs_db()


# ============================================================================
# Request/Response Models
# ============================================================================

class IngestRequest(BaseModel):
    file: str  # base64 encoded
    filename: str
    title: Optional[str] = None
    force_reextract: bool = False


class IngestResponse(BaseModel):
    job_id: str
    doc_id: Optional[str] = None
    status: str
    message: str


class JobStatus(BaseModel):
    job_id: str
    doc_id: Optional[str] = None
    status: str  # pending | processing | completed | failed
    progress: float
    concepts_extracted: Optional[int] = None
    relations_extracted: Optional[int] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


# ============================================================================
# Job Management
# ============================================================================

def create_job(job_id: str, doc_id: Optional[str] = None) -> None:
    """Create a new job in the database"""
    conn = sqlite3.connect(JOBS_DB)
    now = datetime.utcnow().isoformat() + "Z"
    conn.execute("""
        INSERT INTO jobs (job_id, doc_id, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (job_id, doc_id, "pending", 0.0, now, now))
    conn.commit()
    conn.close()


def update_job(job_id: str, status: str = None, progress: float = None,
               doc_id: str = None, concepts: int = None, relations: int = None,
               error: str = None) -> None:
    """Update job status"""
    conn = sqlite3.connect(JOBS_DB)
    now = datetime.utcnow().isoformat() + "Z"
    
    updates = ["updated_at = ?"]
    values = [now]
    
    if status:
        updates.append("status = ?")
        values.append(status)
    if progress is not None:
        updates.append("progress = ?")
        values.append(progress)
    if doc_id:
        updates.append("doc_id = ?")
        values.append(doc_id)
    if concepts is not None:
        updates.append("concepts_extracted = ?")
        values.append(concepts)
    if relations is not None:
        updates.append("relations_extracted = ?")
        values.append(relations)
    if error:
        updates.append("error = ?")
        values.append(error)
    
    values.append(job_id)
    
    conn.execute(f"""
        UPDATE jobs SET {', '.join(updates)}
        WHERE job_id = ?
    """, values)
    conn.commit()
    conn.close()


def get_job(job_id: str) -> Optional[JobStatus]:
    """Get job status"""
    conn = sqlite3.connect(JOBS_DB)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    conn.close()
    
    if not row:
        return None
    
    return JobStatus(
        job_id=row["job_id"],
        doc_id=row["doc_id"],
        status=row["status"],
        progress=row["progress"],
        concepts_extracted=row["concepts_extracted"],
        relations_extracted=row["relations_extracted"],
        error=row["error"],
        created_at=row["created_at"],
        updated_at=row["updated_at"]
    )


# ============================================================================
# Background Task
# ============================================================================

def process_document(job_id: str, file_path: str, title: str):
    """Background task to extract ontology"""
    try:
        # Update status to processing
        update_job(job_id, status="processing", progress=0.1)
        
        # Extract ontology
        doc_id, stats = extract_and_store(file_path, title)
        
        # Update job with results
        update_job(
            job_id,
            status="completed",
            progress=1.0,
            doc_id=doc_id,
            concepts=stats["concepts"],
            relations=stats["relations"]
        )
        
        print(f"✅ Job {job_id} completed: {stats['concepts']} concepts, {stats['relations']} relations")
        
    except Exception as e:
        # Update job with error
        update_job(job_id, status="failed", progress=0.0, error=str(e))
        print(f"❌ Job {job_id} failed: {e}")
        
    finally:
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
def root():
    """API info"""
    return {
        "name": "Loom Lite N8N API",
        "version": "1.0.0",
        "endpoints": {
            "ingest": "POST /api/ingest",
            "job_status": "GET /api/jobs/{job_id}",
            "list_jobs": "GET /api/jobs"
        }
    }


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest_document(request: IngestRequest, background_tasks: BackgroundTasks):
    """
    Ingest a document for ontology extraction
    
    Accepts base64-encoded file and queues extraction job
    """
    
    # Generate job ID
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    try:
        # Decode base64 file
        file_data = base64.b64decode(request.file)
        
        # Save to temp file
        suffix = os.path.splitext(request.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_data)
            tmp_path = tmp.name
        
        # Create job
        create_job(job_id)
        
        # Queue background task
        title = request.title or request.filename
        background_tasks.add_task(process_document, job_id, tmp_path, title)
        
        return IngestResponse(
            job_id=job_id,
            status="pending",
            message="Document queued for extraction"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


@app.post("/api/ingest/file", response_model=IngestResponse)
async def ingest_file(file: UploadFile, background_tasks: BackgroundTasks, title: Optional[str] = None):
    """
    Ingest a document via file upload (alternative to base64)
    """
    
    # Generate job ID
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    
    try:
        # Save uploaded file to temp
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Create job
        create_job(job_id)
        
        # Queue background task
        doc_title = title or file.filename
        background_tasks.add_task(process_document, job_id, tmp_path, doc_title)
        
        return IngestResponse(
            job_id=job_id,
            status="pending",
            message="Document queued for extraction"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


@app.get("/api/jobs/{job_id}", response_model=JobStatus)
def get_job_status(job_id: str):
    """
    Get status of an extraction job
    """
    job = get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job


@app.get("/api/jobs")
def list_jobs(limit: int = 20, status: Optional[str] = None):
    """
    List recent jobs
    """
    conn = sqlite3.connect(JOBS_DB)
    conn.row_factory = sqlite3.Row
    
    if status:
        rows = conn.execute("""
            SELECT * FROM jobs WHERE status = ?
            ORDER BY created_at DESC LIMIT ?
        """, (status, limit)).fetchall()
    else:
        rows = conn.execute("""
            SELECT * FROM jobs
            ORDER BY created_at DESC LIMIT ?
        """, (limit,)).fetchall()
    
    conn.close()
    
    jobs = []
    for row in rows:
        jobs.append({
            "job_id": row["job_id"],
            "doc_id": row["doc_id"],
            "status": row["status"],
            "progress": row["progress"],
            "concepts_extracted": row["concepts_extracted"],
            "relations_extracted": row["relations_extracted"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"]
        })
    
    return {"jobs": jobs, "count": len(jobs)}


@app.delete("/api/jobs/{job_id}")
def delete_job(job_id: str):
    """
    Delete a job record
    """
    conn = sqlite3.connect(JOBS_DB)
    result = conn.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
    conn.commit()
    conn.close()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return {"message": "Job deleted", "job_id": job_id}


if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Loom Lite N8N API on port 8001...")
    print("   Endpoints:")
    print("   - POST /api/ingest")
    print("   - POST /api/ingest/file")
    print("   - GET /api/jobs/{job_id}")
    print("   - GET /api/jobs")
    uvicorn.run(app, host="0.0.0.0", port=8001)

