"""
Semantic Folders Module for LoomLite v3.2
Implements dynamic folder generation and auto-sort functionality
"""
import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime
import json


def get_adaptive_weights(conn: sqlite3.Connection) -> Dict[str, float]:
    """
    Get current adaptive weights from database
    Returns base weights + learned adjustments
    """
    cur = conn.cursor()
    cur.execute("""
        SELECT weight_confidence, weight_relation, weight_recency, weight_hierarchy
        FROM sort_weights
        WHERE id = 'default'
    """)
    row = cur.fetchone()
    
    if row:
        w1, w2, w3, w4 = row
        return {
            'confidence': 0.5 + (w1 or 0.0),
            'relation': 0.2 + (w2 or 0.0),
            'recency': 0.2 + (w3 or 0.0),
            'hierarchy': 0.1 + (w4 or 0.0)
        }
    else:
        # Fallback to base weights if table doesn't exist or no default row
        return {
            'confidence': 0.5,
            'relation': 0.2,
            'recency': 0.2,
            'hierarchy': 0.1
        }


def calculate_auto_sort_score(
    confidence_weight: float,
    relation_count: int,
    created_at: str,
    hierarchy_level: int,
    weights: Optional[Dict[str, float]] = None
) -> float:
    """
    Calculate composite auto-sort score with adaptive weights
    
    Formula: (0.5 + w1) × confidence_weight + (0.2 + w2) × relation_count + (0.2 + w3) × recency_score + (0.1 + w4) × hierarchy_bonus
    """
    # Use provided weights or fallback to base weights
    if weights is None:
        weights = {
            'confidence': 0.5,
            'relation': 0.2,
            'recency': 0.2,
            'hierarchy': 0.1
        }
    
    # Normalize relation count (cap at 20 for scoring)
    relation_score = min(relation_count / 20.0, 1.0)
    
    # Calculate recency score (newer = higher score)
    try:
        doc_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        now = datetime.now()
        days_old = (now - doc_date).days
        # Decay over 365 days
        recency_score = max(0, 1.0 - (days_old / 365.0))
    except:
        recency_score = 0.5  # Default if date parsing fails
    
    # Hierarchy bonus (lower levels = more important)
    # Level 1 (clusters) get highest bonus, level 3+ (concepts) get lower
    hierarchy_bonus = max(0, 1.0 - (hierarchy_level / 4.0))
    
    # Adaptive weighted sum
    score = (
        weights['confidence'] * (confidence_weight or 0.5) +
        weights['relation'] * relation_score +
        weights['recency'] * recency_score +
        weights['hierarchy'] * hierarchy_bonus
    )
    
    return round(score, 3)


def build_semantic_folders(
    conn: sqlite3.Connection,
    query: Optional[str] = None,
    sort_mode: str = "auto"
) -> Dict[str, Any]:
    """
    Generate virtual folders based on query and sort mode
    
    Args:
        conn: Database connection
        query: Search term to filter concepts/documents
        sort_mode: "auto", "alphabetical", or "recency"
    
    Returns:
        Dictionary with folder structure and items
    """
    cur = conn.cursor()
    
    # Build SQL query
    if query:
        # Search for documents with matching concepts, summaries, or parent clusters
        sql = """
            SELECT DISTINCT
                d.id as doc_id,
                d.title,
                d.created_at,
                c.label as concept_label,
                c.type as concept_type,
                c.confidence,
                c.hierarchy_level,
                c.parent_cluster_id,
                (SELECT COUNT(*) FROM relations r 
                 WHERE r.src = c.id OR r.dst = c.id) as relation_count
            FROM documents d
            JOIN concepts c ON d.id = c.doc_id
            LEFT JOIN concepts parent ON c.parent_cluster_id = parent.id
            WHERE 
                c.label LIKE ? OR 
                c.summary LIKE ? OR 
                d.title LIKE ? OR
                d.summary LIKE ? OR
                parent.label LIKE ? OR
                parent.summary LIKE ?
        """
        params = (f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%", f"%{query}%")
    else:
        # Return all documents grouped by clusters
        sql = """
            SELECT DISTINCT
                d.id as doc_id,
                d.title,
                d.created_at,
                c.label as concept_label,
                c.type as concept_type,
                c.confidence,
                c.hierarchy_level,
                c.parent_cluster_id,
                (SELECT COUNT(*) FROM relations r 
                 WHERE r.src = c.id OR r.dst = c.id) as relation_count
            FROM documents d
            JOIN concepts c ON d.id = c.doc_id
            WHERE c.hierarchy_level IN (0, 1)
        """
        params = ()
    
    cur.execute(sql, params)
    rows = cur.fetchall()
    
    # Get adaptive weights for auto-sort mode
    weights = None
    if sort_mode == "auto":
        try:
            weights = get_adaptive_weights(conn)
        except:
            # Fallback to base weights if sort_weights table doesn't exist
            weights = None
    
    # Group documents by cluster
    folders = {}
    doc_scores = {}
    
    for row in rows:
        doc_id, title, created_at, concept_label, concept_type, confidence, hierarchy_level, parent_cluster_id, relation_count = row
        
        # Calculate auto-sort score with adaptive weights
        score = calculate_auto_sort_score(
            confidence_weight=confidence,
            relation_count=relation_count,
            created_at=created_at,
            hierarchy_level=hierarchy_level or 3,
            weights=weights
        )
        
        # Determine folder name
        if hierarchy_level == 1:  # Cluster
            folder_name = concept_label
        elif parent_cluster_id:
            # Get cluster name
            cur.execute("SELECT label FROM concepts WHERE id = ?", (parent_cluster_id,))
            cluster_row = cur.fetchone()
            folder_name = cluster_row[0] if cluster_row else "Uncategorized"
        else:
            folder_name = "Uncategorized"
        
        # Add to folder
        if folder_name not in folders:
            folders[folder_name] = []
        
        # Track document score (use highest score if document appears multiple times)
        if doc_id not in doc_scores or score > doc_scores[doc_id]["score"]:
            doc_scores[doc_id] = {
                "doc_id": doc_id,
                "title": title,
                "score": score,
                "created_at": created_at,
                "concept_type": concept_type
            }
    
    # Add a special "Recent Files" folder with all documents
    recent_files_items = list(doc_scores.values())
    if sort_mode == "auto" or sort_mode == "recency":
        recent_files_items.sort(key=lambda x: x["created_at"], reverse=True)
    elif sort_mode == "alphabetical":
        recent_files_items.sort(key=lambda x: x["title"])
    
    # Limit to 10 most recent
    folders["📅 Recent Files"] = recent_files_items[:10]
    
    # Add documents to folders (deduplicated)
    for folder_name in list(folders.keys()):
        if folder_name == "📅 Recent Files":
            continue  # Already populated
            
        # Get all doc_ids for this folder
        folder_doc_ids = set()
        for row in rows:
            doc_id, title, created_at, concept_label, concept_type, confidence, hierarchy_level, parent_cluster_id, relation_count = row
            if hierarchy_level == 1 and concept_label == folder_name:
                folder_doc_ids.add(doc_id)
            elif parent_cluster_id:
                cur.execute("SELECT label FROM concepts WHERE id = ?", (parent_cluster_id,))
                cluster_row = cur.fetchone()
                if cluster_row and cluster_row[0] == folder_name:
                    folder_doc_ids.add(doc_id)
        
        # Add documents with scores
        folder_items = [doc_scores[doc_id] for doc_id in folder_doc_ids if doc_id in doc_scores]
        
        # Sort based on mode
        if sort_mode == "auto":
            folder_items.sort(key=lambda x: x["score"], reverse=True)
        elif sort_mode == "alphabetical":
            folder_items.sort(key=lambda x: x["title"])
        elif sort_mode == "recency":
            folder_items.sort(key=lambda x: x["created_at"], reverse=True)
        
        folders[folder_name] = folder_items
    
    # Sort folders with Recent Files first
    sorted_folders = []
    
    # Add Recent Files first if it exists
    if "📅 Recent Files" in folders:
        sorted_folders.append({
            "name": "📅 Recent Files",
            "items": folders["📅 Recent Files"]
        })
    
    # Add remaining folders in alphabetical order
    for folder_name in sorted(folders.keys()):
        if folder_name != "📅 Recent Files":
            sorted_folders.append({
                "name": folder_name,
                "items": folders[folder_name]
            })
    
    return {
        "folders": sorted_folders,
        "sort_mode": sort_mode,
        "query": query
    }


def get_saved_views(conn: sqlite3.Connection, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all saved views for a user"""
    cur = conn.cursor()
    
    if user_id:
        cur.execute("""
            SELECT id, view_name, query, sort_mode, created_at
            FROM saved_views
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))
    else:
        cur.execute("""
            SELECT id, view_name, query, sort_mode, created_at
            FROM saved_views
            ORDER BY created_at DESC
        """)
    
    rows = cur.fetchall()
    return [
        {
            "id": row[0],
            "view_name": row[1],
            "query": row[2],
            "sort_mode": row[3],
            "created_at": row[4]
        }
        for row in rows
    ]


def create_saved_view(
    conn: sqlite3.Connection,
    view_name: str,
    query: str,
    sort_mode: str = "auto",
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new saved view"""
    import uuid
    
    view_id = f"view_{uuid.uuid4().hex[:12]}"
    created_at = datetime.utcnow().isoformat() + "Z"
    
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO saved_views (id, view_name, query, sort_mode, created_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (view_id, view_name, query, sort_mode, created_at, user_id))
    
    conn.commit()
    
    return {
        "id": view_id,
        "view_name": view_name,
        "query": query,
        "sort_mode": sort_mode,
        "created_at": created_at
    }


def delete_saved_view(conn: sqlite3.Connection, view_id: str) -> bool:
    """Delete a saved view"""
    cur = conn.cursor()
    cur.execute("DELETE FROM saved_views WHERE id = ?", (view_id,))
    conn.commit()
    return cur.rowcount > 0

