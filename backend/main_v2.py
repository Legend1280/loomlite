"""
Loom Lite MVP - FastAPI Backend v2
Returns MicroOntology objects matching the ontology-first specification
"""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from typing import List, Dict, Any, Optional
import sqlite3
import json
from datetime import datetime
from pathlib import Path

# Import Pydantic models
from models import (
    MicroOntology, DocumentMetadata, OntologyVersion,
    Span, Concept, Relation, MentionLink, VectorConfig,
    SearchResult, JumpTarget, TreeNode, FilterOption
)

app = FastAPI(title="Loom Lite API v2", version="2.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "/home/ubuntu/loom-lite-mvp/backend/loom_lite_v2.db"


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
        "name": "Loom Lite API v2",
        "version": "2.0.0",
        "spec": "MicroOntology",
        "endpoints": {
            "tree": "/tree",
            "search": "/search?q=query&types=Metric,Date&tags=Finance",
            "doc_ontology": "/doc/{doc_id}/ontology",
            "jump": "/jump?doc_id=xxx&concept_id=yyy",
            "concepts": "/concepts?types=Metric,Date",
            "tags": "/tags",
            "filters": "/filters"
        }
    }


@app.get("/tree")
def get_tree() -> List[TreeNode]:
    """Get document tree with concept counts"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get all documents with concept counts
    docs = cur.execute("""
        SELECT 
            d.id,
            d.title,
            d.mime,
            COUNT(DISTINCT c.id) as concept_count
        FROM documents d
        LEFT JOIN concepts c ON d.id = c.doc_id
        GROUP BY d.id
        ORDER BY d.created_at DESC
    """).fetchall()
    
    tree = []
    for doc in docs:
        tree.append(TreeNode(
            id=doc["id"],
            type="file",
            name=doc["title"],
            parent="root",
            mime=doc["mime"],
            concept_count=doc["concept_count"]
        ))
    
    conn.close()
    return tree


@app.get("/doc/{doc_id}/ontology")
def get_document_ontology(doc_id: str) -> MicroOntology:
    """Get complete MicroOntology for a document"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get document metadata
    doc_row = cur.execute("""
        SELECT * FROM documents WHERE id = ?
    """, (doc_id,)).fetchone()
    
    if not doc_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = DocumentMetadata(
        doc_id=doc_row["id"],
        title=doc_row["title"],
        source_uri=doc_row["source_uri"],
        mime=doc_row["mime"],
        checksum=doc_row["checksum"],
        bytes=doc_row["bytes"],
        created_at=doc_row["created_at"],
        updated_at=doc_row["updated_at"]
    )
    
    # Get ontology version
    ver_row = cur.execute("""
        SELECT * FROM ontology_versions 
        WHERE doc_id = ? AND superseded = 0
        ORDER BY extracted_at DESC LIMIT 1
    """, (doc_id,)).fetchone()
    
    if ver_row:
        version = OntologyVersion(
            ontology_version_id=ver_row["id"],
            model={"name": ver_row["model_name"], "version": ver_row["model_version"] or ""},
            extracted_at=ver_row["extracted_at"],
            pipeline=ver_row["pipeline"] or "",
            notes=ver_row["notes"]
        )
    else:
        version = OntologyVersion(
            ontology_version_id="ver_default",
            model={"name": "manual", "version": "1.0"},
            extracted_at=datetime.utcnow().isoformat() + "Z",
            pipeline="manual"
        )
    
    # Get spans
    span_rows = cur.execute("""
        SELECT * FROM spans WHERE doc_id = ? ORDER BY start
    """, (doc_id,)).fetchall()
    
    spans = []
    for row in span_rows:
        provenance = None
        if row["extractor"] or row["quality"]:
            provenance = {}
            if row["extractor"]:
                provenance["extractor"] = row["extractor"]
            if row["quality"]:
                provenance["quality"] = row["quality"]
        
        spans.append(Span(
            span_id=row["id"],
            doc_id=row["doc_id"],
            start=row["start"],
            end=row["end"],
            text=row["text"],
            page_hint=row["page_hint"],
            section=row["section"],
            provenance=provenance
        ))
    
    # Get concepts
    concept_rows = cur.execute("""
        SELECT * FROM concepts WHERE doc_id = ? ORDER BY label
    """, (doc_id,)).fetchall()
    
    concepts = []
    for row in concept_rows:
        aliases = json.loads(row["aliases"]) if row["aliases"] else None
        tags = json.loads(row["tags"]) if row["tags"] else None
        
        provenance = None
        if row["model_name"] or row["prompt_ver"]:
            provenance = {}
            if row["model_name"]:
                provenance["model"] = row["model_name"]
            if row["prompt_ver"]:
                provenance["prompt_ver"] = row["prompt_ver"]
        
        concepts.append(Concept(
            concept_id=row["id"],
            doc_id=row["doc_id"],
            label=row["label"],
            type=row["type"],
            confidence=row["confidence"] or 1.0,
            aliases=aliases,
            tags=tags,
            provenance=provenance
        ))
    
    # Get relations
    relation_rows = cur.execute("""
        SELECT * FROM relations WHERE doc_id = ?
    """, (doc_id,)).fetchall()
    
    relations = []
    for row in relation_rows:
        provenance = None
        if row["model_name"] or row["rule"]:
            provenance = {}
            if row["model_name"]:
                provenance["model"] = row["model_name"]
            if row["rule"]:
                provenance["rule"] = row["rule"]
        
        relations.append(Relation(
            relation_id=row["id"],
            doc_id=row["doc_id"],
            src=row["src"],
            rel=row["rel"],
            dst=row["dst"],
            confidence=row["confidence"] or 1.0,
            provenance=provenance
        ))
    
    # Get mentions (group by concept_id)
    mention_rows = cur.execute("""
        SELECT * FROM mentions WHERE doc_id = ? ORDER BY concept_id
    """, (doc_id,)).fetchall()
    
    mentions_dict = {}
    for row in mention_rows:
        concept_id = row["concept_id"]
        if concept_id not in mentions_dict:
            mentions_dict[concept_id] = []
        
        mentions_dict[concept_id].append(MentionLink(
            span_id=row["span_id"],
            confidence=row["confidence"] or 1.0
        ))
    
    # Build MicroOntology
    ontology = MicroOntology(
        doc=doc,
        version=version,
        spans=spans,
        concepts=concepts,
        relations=relations,
        mentions=mentions_dict,
        vectors=VectorConfig()
    )
    
    conn.close()
    return ontology


@app.get("/jump")
def jump_to_evidence(doc_id: str, concept_id: str) -> List[JumpTarget]:
    """Get evidence locations for a concept"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get all mentions for this concept
    mention_rows = cur.execute("""
        SELECT m.*, s.text, s.start, s."end", s.page_hint
        FROM mentions m
        JOIN spans s ON m.span_id = s.id
        WHERE m.doc_id = ? AND m.concept_id = ?
        ORDER BY s.start
    """, (doc_id, concept_id)).fetchall()
    
    if not mention_rows:
        conn.close()
        raise HTTPException(status_code=404, detail="No evidence found")
    
    targets = []
    for row in mention_rows:
        # Get context (100 chars before and after)
        context_start = max(0, row["start"] - 100)
        context_end = row["end"] + 100
        
        context_row = cur.execute("""
            SELECT text FROM spans 
            WHERE doc_id = ? AND start <= ? AND "end" >= ?
            LIMIT 1
        """, (doc_id, context_start, context_end)).fetchone()
        
        context = context_row["text"] if context_row else row["text"]
        
        targets.append(JumpTarget(
            doc_id=doc_id,
            concept_id=concept_id,
            span_id=row["span_id"],
            text=row["text"],
            start=row["start"],
            end=row["end"],
            page_hint=row["page_hint"],
            context=context
        ))
    
    conn.close()
    return targets


@app.get("/search")
def search(
    q: str = Query(..., description="Search query"),
    types: Optional[str] = Query(None, description="Comma-separated concept types"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    limit: int = Query(20, ge=1, le=100)
) -> List[SearchResult]:
    """Hybrid search across concepts and spans"""
    conn = get_db()
    cur = conn.cursor()
    
    # Build query
    where_clauses = []
    params = []
    
    # Text search on concept labels
    where_clauses.append("c.label LIKE ?")
    params.append(f"%{q}%")
    
    # Type filter
    if types:
        type_list = [t.strip() for t in types.split(",")]
        placeholders = ",".join(["?" for _ in type_list])
        where_clauses.append(f"c.type IN ({placeholders})")
        params.extend(type_list)
    
    # Tag filter (simple JSON contains check)
    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            where_clauses.append("c.tags LIKE ?")
            params.append(f"%{tag}%")
    
    where_sql = " AND ".join(where_clauses)
    
    # Execute search
    results = cur.execute(f"""
        SELECT 
            c.id as concept_id,
            c.doc_id,
            c.label,
            c.type,
            c.confidence,
            d.title as doc_title,
            (SELECT text FROM spans s 
             JOIN mentions m ON s.id = m.span_id 
             WHERE m.concept_id = c.id LIMIT 1) as snippet
        FROM concepts c
        JOIN documents d ON c.doc_id = d.id
        WHERE {where_sql}
        ORDER BY c.confidence DESC
        LIMIT ?
    """, params + [limit]).fetchall()
    
    search_results = []
    for row in results:
        search_results.append(SearchResult(
            concept_id=row["concept_id"],
            doc_id=row["doc_id"],
            label=row["label"],
            type=row["type"],
            score=row["confidence"] or 1.0,
            snippet=row["snippet"]
        ))
    
    conn.close()
    return search_results


@app.get("/concepts")
def get_concepts(
    types: Optional[str] = Query(None, description="Comma-separated types"),
    limit: int = Query(100, ge=1, le=500)
) -> List[Concept]:
    """Get concepts with optional type filtering"""
    conn = get_db()
    cur = conn.cursor()
    
    if types:
        type_list = [t.strip() for t in types.split(",")]
        placeholders = ",".join(["?" for _ in type_list])
        query = f"""
            SELECT * FROM concepts 
            WHERE type IN ({placeholders})
            ORDER BY confidence DESC
            LIMIT ?
        """
        params = type_list + [limit]
    else:
        query = "SELECT * FROM concepts ORDER BY confidence DESC LIMIT ?"
        params = [limit]
    
    rows = cur.execute(query, params).fetchall()
    
    concepts = []
    for row in rows:
        aliases = json.loads(row["aliases"]) if row["aliases"] else None
        tags = json.loads(row["tags"]) if row["tags"] else None
        
        provenance = None
        if row["model_name"] or row["prompt_ver"]:
            provenance = {}
            if row["model_name"]:
                provenance["model"] = row["model_name"]
            if row["prompt_ver"]:
                provenance["prompt_ver"] = row["prompt_ver"]
        
        concepts.append(Concept(
            concept_id=row["id"],
            doc_id=row["doc_id"],
            label=row["label"],
            type=row["type"],
            confidence=row["confidence"] or 1.0,
            aliases=aliases,
            tags=tags,
            provenance=provenance
        ))
    
    conn.close()
    return concepts


@app.get("/tags")
def get_tags() -> List[str]:
    """Get all unique tags from concepts"""
    conn = get_db()
    cur = conn.cursor()
    
    rows = cur.execute("""
        SELECT DISTINCT tags FROM concepts WHERE tags IS NOT NULL
    """).fetchall()
    
    tags_set = set()
    for row in rows:
        if row["tags"]:
            tag_list = json.loads(row["tags"])
            tags_set.update(tag_list)
    
    conn.close()
    return sorted(list(tags_set))


@app.get("/filters")
def get_filters() -> Dict[str, List[FilterOption]]:
    """Get filter options with counts"""
    conn = get_db()
    cur = conn.cursor()
    
    # Get concept type counts
    type_rows = cur.execute("""
        SELECT type, COUNT(*) as count
        FROM concepts
        GROUP BY type
        ORDER BY count DESC
    """).fetchall()
    
    type_filters = [
        FilterOption(label=row["type"], type="concept_type", count=row["count"])
        for row in type_rows
    ]
    
    # Get tag counts
    tag_rows = cur.execute("""
        SELECT tags FROM concepts WHERE tags IS NOT NULL
    """).fetchall()
    
    tag_counts = {}
    for row in tag_rows:
        if row["tags"]:
            tag_list = json.loads(row["tags"])
            for tag in tag_list:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    tag_filters = [
        FilterOption(label=tag, type="tag", count=count)
        for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)
    ]
    
    conn.close()
    
    return {
        "types": type_filters,
        "tags": tag_filters
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

