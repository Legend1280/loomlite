"""
Loom Lite MVP - FastAPI Backend
Enhanced with N8N integration and concept filtering
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from typing import List, Dict, Any, Optional
import sqlite3
import json
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Loom Lite API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "/home/ubuntu/loom-lite-mvp/backend/loom_lite.db"


def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@app.get("/", include_in_schema=False)
def root():
    """Redirect to frontend"""
    return RedirectResponse(url="/frontend/index.html")

@app.get("/api")
def api_root():
    """API documentation"""
    return {
        "name": "Loom Lite API",
        "version": "1.0.0",
        "endpoints": {
            "tree": "/tree",
            "search": "/search?q=query&types=Metric,Date&tags=project:Loom Lite",
            "doc_ontology": "/doc/{doc_id}/ontology",
            "jump": "/jump?doc_id=xxx&concept_id=yyy",
            "concepts": "/concepts?types=Metric,Date",
            "tags": "/tags",
            "ingest": "/api/ingest (POST)",
            "extract": "/api/extract (POST)"
        }
    }


@app.get("/tree")
def get_tree() -> List[Dict[str, Any]]:
    """Get file tree structure"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get all documents
    cursor.execute("""
        SELECT id, title, path, mime, created_at
        FROM Document
        ORDER BY title
    """)
    
    docs = cursor.fetchall()
    conn.close()
    
    # Build tree structure
    tree = []
    folders = {}
    
    for doc in docs:
        path_parts = Path(doc["path"]).parts
        
        # Create folder hierarchy
        current_parent = "root"
        for i, part in enumerate(path_parts[:-1]):
            folder_id = "/".join(path_parts[:i+1])
            if folder_id not in folders:
                folders[folder_id] = {
                    "id": folder_id,
                    "type": "folder",
                    "name": part,
                    "parent": current_parent
                }
                tree.append(folders[folder_id])
            current_parent = folder_id
        
        # Add document
        tree.append({
            "id": doc["id"],
            "type": "file",
            "name": doc["title"],
            "parent": current_parent if len(path_parts) > 1 else "root",
            "mime": doc["mime"]
        })
    
    return tree


@app.get("/tags")
def get_all_tags() -> Dict[str, List[Dict[str, Any]]]:
    """Get all available tags grouped by category"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT DISTINCT category, value, AVG(confidence) as avg_confidence, COUNT(*) as count
        FROM Tag
        GROUP BY category, value
        ORDER BY category, count DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    # Group by category
    tags_by_category = {}
    for row in rows:
        category = row["category"]
        if category not in tags_by_category:
            tags_by_category[category] = []
        tags_by_category[category].append({
            "value": row["value"],
            "confidence": round(row["avg_confidence"], 2),
            "count": row["count"]
        })
    
    return tags_by_category


@app.get("/concepts")
def get_concepts(
    types: Optional[str] = Query(None, description="Comma-separated concept types"),
    doc_ids: Optional[str] = Query(None, description="Comma-separated document IDs")
) -> List[Dict[str, Any]]:
    """Get concepts with optional filtering"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT DISTINCT c.* FROM Concept c"
    conditions = []
    params = []
    
    if doc_ids:
        query += " JOIN Mention m ON c.id = m.concept_id"
        conditions.append(f"m.doc_id IN ({','.join(['?']*len(doc_ids.split(',')))})")
        params.extend(doc_ids.split(','))
    
    if types:
        type_list = types.split(',')
        conditions.append(f"c.type IN ({','.join(['?']*len(type_list))})")
        params.extend(type_list)
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " ORDER BY c.confidence DESC, c.label"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


@app.get("/doc/{doc_id}/ontology")
def get_doc_ontology(doc_id: str) -> Dict[str, Any]:
    """Get ontology for a specific document"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document info
    cursor.execute("SELECT * FROM Document WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get concepts mentioned in this document
    cursor.execute("""
        SELECT DISTINCT c.*
        FROM Concept c
        JOIN Mention m ON c.id = m.concept_id
        WHERE m.doc_id = ?
        ORDER BY c.confidence DESC
    """, (doc_id,))
    concepts = [dict(row) for row in cursor.fetchall()]
    
    # Get concept IDs
    concept_ids = [c["id"] for c in concepts]
    
    # Get relations between these concepts
    relations = []
    if concept_ids:
        placeholders = ','.join(['?'] * len(concept_ids))
        cursor.execute(f"""
            SELECT r.*
            FROM Relation r
            WHERE r.src_concept_id IN ({placeholders})
            AND r.dst_concept_id IN ({placeholders})
            ORDER BY r.confidence DESC
        """, concept_ids + concept_ids)
        relations = [dict(row) for row in cursor.fetchall()]
    
    # Get tags
    cursor.execute("""
        SELECT category, value, confidence
        FROM Tag
        WHERE doc_id = ?
        ORDER BY confidence DESC
    """, (doc_id,))
    tags = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return {
        "document": dict(doc),
        "concepts": concepts,
        "relations": relations,
        "tags": tags
    }


@app.get("/search")
def search(
    q: str = Query(..., description="Search query"),
    types: Optional[str] = Query(None, description="Filter by concept types (comma-separated)"),
    tags: Optional[str] = Query(None, description="Filter by tags (format: category:value)"),
    limit: int = Query(10, ge=1, le=100)
) -> List[Dict[str, Any]]:
    """Search documents and concepts"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Build search query
    query = """
        SELECT DISTINCT d.id as doc_id, d.title, d.mime,
               GROUP_CONCAT(DISTINCT c.label) as matched_concepts,
               COUNT(DISTINCT c.id) as concept_count
        FROM Document d
        LEFT JOIN Mention m ON d.id = m.doc_id
        LEFT JOIN Concept c ON m.concept_id = c.id
        LEFT JOIN Span s ON d.id = s.doc_id
        WHERE (
            s.text LIKE ? OR
            c.label LIKE ? OR
            d.title LIKE ?
        )
    """
    params = [f"%{q}%", f"%{q}%", f"%{q}%"]
    
    # Add concept type filter
    if types:
        type_list = types.split(',')
        query += f" AND c.type IN ({','.join(['?']*len(type_list))})"
        params.extend(type_list)
    
    # Add tag filter
    if tags:
        for tag_filter in tags.split(','):
            if ':' in tag_filter:
                category, value = tag_filter.split(':', 1)
                query += """
                    AND d.id IN (
                        SELECT doc_id FROM Tag 
                        WHERE category = ? AND value LIKE ?
                    )
                """
                params.extend([category, f"%{value}%"])
    
    query += " GROUP BY d.id ORDER BY concept_count DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    # Enhance results with snippets
    enhanced_results = []
    for row in results:
        doc_id = row["doc_id"]
        
        # Get top concept matches
        cursor.execute("""
            SELECT c.label, c.type, c.confidence, s.text, s.start_int, s.end_int
            FROM Concept c
            JOIN Mention m ON c.id = m.concept_id
            JOIN Span s ON m.span_id = s.id
            WHERE m.doc_id = ? AND (c.label LIKE ? OR s.text LIKE ?)
            ORDER BY c.confidence DESC
            LIMIT 3
        """, (doc_id, f"%{q}%", f"%{q}%"))
        
        top_hits = []
        for hit in cursor.fetchall():
            # Extract snippet around match
            text = hit["text"]
            start = max(0, hit["start_int"] - 50)
            end = min(len(text), hit["end_int"] + 50)
            snippet = text[start:end]
            
            top_hits.append({
                "concept": hit["label"],
                "type": hit["type"],
                "confidence": hit["confidence"],
                "snippet": snippet
            })
        
        enhanced_results.append({
            "doc_id": row["doc_id"],
            "title": row["title"],
            "mime": row["mime"],
            "matched_concepts": row["matched_concepts"],
            "concept_count": row["concept_count"],
            "top_hits": top_hits
        })
    
    conn.close()
    return enhanced_results


@app.get("/jump")
def jump(
    doc_id: str = Query(...),
    concept_id: Optional[str] = Query(None),
    span_id: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Jump to specific span in document"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get document
    cursor.execute("SELECT * FROM Document WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get full document text
    cursor.execute("""
        SELECT text FROM Span WHERE doc_id = ? ORDER BY start_int LIMIT 1
    """, (doc_id,))
    text_row = cursor.fetchone()
    full_text = text_row["text"] if text_row else ""
    
    # Find specific span
    if span_id:
        cursor.execute("SELECT * FROM Span WHERE id = ?", (span_id,))
        span = cursor.fetchone()
    elif concept_id:
        cursor.execute("""
            SELECT s.* FROM Span s
            JOIN Mention m ON s.id = m.span_id
            WHERE m.concept_id = ? AND m.doc_id = ?
            ORDER BY s.start_int
            LIMIT 1
        """, (concept_id, doc_id))
        span = cursor.fetchone()
    else:
        span = None
    
    conn.close()
    
    if span:
        return {
            "text": full_text,
            "start": span["start_int"],
            "end": span["end_int"],
            "highlighted_text": span["text"]
        }
    else:
        return {
            "text": full_text,
            "start": 0,
            "end": 0,
            "highlighted_text": ""
        }


# N8N Integration Endpoints

@app.post("/api/ingest")
async def ingest_documents(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Start document ingestion job (for N8N workflows)
    Input: {folder_path: str, files: List[str]}
    """
    folder_path = data.get("folder_path")
    files = data.get("files", [])
    
    # For MVP, return mock job ID
    job_id = f"job_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    return {
        "job_id": job_id,
        "status": "processing",
        "folder_path": folder_path,
        "file_count": len(files),
        "message": "Ingestion job started. Use GET /api/job/{job_id} to check status."
    }


@app.get("/api/job/{job_id}")
def get_job_status(job_id: str) -> Dict[str, Any]:
    """Get ingestion job status (for N8N workflows)"""
    # For MVP, return mock completed status
    return {
        "job_id": job_id,
        "status": "completed",
        "progress": 100,
        "results": {
            "documents_processed": 3,
            "concepts_extracted": 36,
            "relations_found": 22
        }
    }


@app.post("/api/extract")
async def extract_ontology(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract ontology from text (for N8N workflows)
    Input: {text: str, doc_id: str}
    """
    text = data.get("text", "")
    doc_id = data.get("doc_id", "")
    
    # For MVP, return mock extraction
    # In production, this would call LLM extraction pipeline
    return {
        "doc_id": doc_id,
        "concepts": [
            {"id": "c_extracted_1", "label": "Sample Concept", "type": "Topic", "confidence": 0.85}
        ],
        "relations": [
            {"src": "c_extracted_1", "rel": "defines", "dst": "c_extracted_2", "confidence": 0.80}
        ],
        "mentions": {
            "c_extracted_1": [{"span_start": 0, "span_end": 14}]
        },
        "message": "Extraction completed. Use POST /api/ingest to persist results."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

