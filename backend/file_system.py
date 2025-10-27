"""
File System Module for LoomLite v4.0
Implements 4-tier folder architecture with Top Hits, Pinned, Standard, and Semantic folders
"""

import sqlite3
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json


def get_top_hits(conn: sqlite3.Connection, limit: int = 6) -> List[Dict[str, Any]]:
    """
    Get top hits based on dwell time, recency, and frequency
    
    Formula: score = 0.4 × dwell_time_normalized + 0.3 × recency_score + 0.3 × view_frequency
    """
    cur = conn.cursor()
    
    # Get documents with engagement metrics
    cur.execute("""
        SELECT 
            d.id,
            d.title,
            d.created_at,
            d.summary,
            COALESCE(SUM(fs.dwell_time), 0) as total_dwell_time,
            COALESCE(SUM(fs.view_count), 0) as total_views,
            MAX(fs.last_opened) as last_opened
        FROM documents d
        LEFT JOIN folder_stats fs ON d.id = fs.doc_id
        GROUP BY d.id
        HAVING total_views > 0
        ORDER BY total_dwell_time DESC, total_views DESC, last_opened DESC
        LIMIT ?
    """, (limit,))
    
    rows = cur.fetchall()
    
    top_hits = []
    for row in rows:
        doc_id, title, created_at, summary, dwell_time, views, last_opened = row
        
        # Calculate engagement score
        dwell_score = min(dwell_time / 300.0, 1.0) if dwell_time else 0  # Normalize to 5 min
        
        # Recency score
        if last_opened:
            try:
                last_opened_dt = datetime.fromisoformat(last_opened.replace('Z', '+00:00'))
                hours_ago = (datetime.now() - last_opened_dt).total_seconds() / 3600
                recency_score = max(0, 1.0 - (hours_ago / 168.0))  # Decay over 1 week
            except:
                recency_score = 0
        else:
            recency_score = 0
        
        # View frequency score
        freq_score = min(views / 10.0, 1.0)  # Normalize to 10 views
        
        # Combined score
        score = 0.4 * dwell_score + 0.3 * recency_score + 0.3 * freq_score
        
        top_hits.append({
            "id": doc_id,
            "title": title,
            "created_at": created_at,
            "summary": summary[:100] if summary else None,
            "engagement_score": round(score, 3),
            "views": views,
            "dwell_time": dwell_time,
            "last_opened": last_opened
        })
    
    return top_hits


def get_pinned_folders(conn: sqlite3.Connection, user_id: str = "default") -> List[Dict[str, Any]]:
    """
    Get user-pinned folders and documents
    """
    cur = conn.cursor()
    
    # Check if user_pins table exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_pins'")
    if not cur.fetchone():
        return []
    
    cur.execute("""
        SELECT pin_id, pin_type, target_id, label, created_at
        FROM user_pins
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))
    
    rows = cur.fetchall()
    
    pinned = []
    for row in rows:
        pin_id, pin_type, target_id, label, created_at = row
        
        pinned.append({
            "pin_id": pin_id,
            "type": pin_type,  # "document" or "folder"
            "target_id": target_id,
            "label": label,
            "created_at": created_at
        })
    
    return pinned


def get_standard_folder(conn: sqlite3.Connection, folder_type: str) -> Dict[str, Any]:
    """
    Get standard folder contents (recent, type, author, date, favorites)
    """
    cur = conn.cursor()
    
    if folder_type == "recent":
        # Recent files (last 30 days, sorted by created_at DESC)
        cur.execute("""
            SELECT id, title, created_at, summary
            FROM documents
            WHERE created_at >= datetime('now', '-30 days')
            ORDER BY created_at DESC
            LIMIT 50
        """)
        
    elif folder_type == "favorites":
        # Favorites (check if favorites table exists)
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'")
        if not cur.fetchone():
            return {"folder_name": "Favorites", "items": []}
        
        cur.execute("""
            SELECT d.id, d.title, d.created_at, d.summary
            FROM documents d
            JOIN favorites f ON d.id = f.doc_id
            WHERE f.user_id = 'default'
            ORDER BY f.created_at DESC
        """)
    
    else:
        # Unknown folder type
        return {"folder_name": folder_type.title(), "items": []}
    
    rows = cur.fetchall()
    
    items = []
    for row in rows:
        doc_id, title, created_at, summary = row
        items.append({
            "id": doc_id,
            "title": title,
            "created_at": created_at,
            "summary": summary[:100] if summary else None
        })
    
    folder_name_map = {
        "recent": "Recent Files",
        "favorites": "Favorites"
    }
    
    return {
        "folder_name": folder_name_map.get(folder_type, folder_type.title()),
        "items": items
    }


def get_standard_folders_by_type(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """
    Get documents grouped by file type
    """
    cur = conn.cursor()
    
    # Get all documents with file types
    cur.execute("""
        SELECT id, title, created_at, summary, 
               LOWER(SUBSTR(title, -4)) as extension
        FROM documents
        ORDER BY created_at DESC
    """)
    
    rows = cur.fetchall()
    
    # Group by extension
    by_type = {}
    for row in rows:
        doc_id, title, created_at, summary, ext = row
        
        # Clean extension
        if ext and ext.startswith('.'):
            ext = ext[1:]
        else:
            ext = 'unknown'
        
        if ext not in by_type:
            by_type[ext] = []
        
        by_type[ext].append({
            "id": doc_id,
            "title": title,
            "created_at": created_at,
            "summary": summary[:100] if summary else None,
            "type": ext
        })
    
    # Convert to list of folders
    folders = []
    for ext, items in by_type.items():
        folders.append({
            "folder_name": f"{ext.upper()} Files",
            "type": ext,
            "items": items
        })
    
    # Sort by number of items (most common types first)
    folders.sort(key=lambda x: len(x["items"]), reverse=True)
    
    return folders


def get_standard_folders_by_date(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    """
    Get documents grouped by date buckets (Today, This Week, This Month, Older)
    """
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, title, created_at, summary
        FROM documents
        ORDER BY created_at DESC
    """)
    
    rows = cur.fetchall()
    
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    buckets = {
        "Today": [],
        "This Week": [],
        "This Month": [],
        "Older": []
    }
    
    for row in rows:
        doc_id, title, created_at, summary = row
        
        try:
            doc_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            if doc_date >= today_start:
                bucket = "Today"
            elif doc_date >= week_start:
                bucket = "This Week"
            elif doc_date >= month_start:
                bucket = "This Month"
            else:
                bucket = "Older"
            
            buckets[bucket].append({
                "id": doc_id,
                "title": title,
                "created_at": created_at,
                "summary": summary[:100] if summary else None
            })
        except:
            buckets["Older"].append({
                "id": doc_id,
                "title": title,
                "created_at": created_at,
                "summary": summary[:100] if summary else None
            })
    
    # Convert to list of folders
    folders = []
    for bucket_name in ["Today", "This Week", "This Month", "Older"]:
        if buckets[bucket_name]:  # Only include non-empty buckets
            folders.append({
                "folder_name": bucket_name,
                "items": buckets[bucket_name]
            })
    
    return folders


def get_semantic_folder(conn: sqlite3.Connection, category: str) -> Dict[str, Any]:
    """
    Get semantic folder contents based on ontology
    
    Categories: projects, concepts, financial, research, ai_tech
    """
    cur = conn.cursor()
    
    # Define category queries
    if category == "projects":
        where_clause = "c.type = 'Project'"
    elif category == "concepts":
        where_clause = "c.type IN ('Topic', 'Concept')"
    elif category == "financial":
        where_clause = "(c.label LIKE '%Finance%' OR c.label LIKE '%Revenue%' OR c.label LIKE '%Budget%')"
    elif category == "research":
        where_clause = "(c.label LIKE '%Research%' OR c.label LIKE '%Analysis%' OR c.label LIKE '%Study%')"
    elif category == "ai_tech":
        where_clause = "(c.label LIKE '%AI%' OR c.label LIKE '%Machine Learning%' OR c.label LIKE '%Tech%')"
    else:
        return {"folder_name": category.title(), "items": []}
    
    # Query documents with matching concepts
    cur.execute(f"""
        SELECT DISTINCT
            d.id,
            d.title,
            d.created_at,
            d.summary,
            c.label as concept_label,
            c.confidence
        FROM documents d
        JOIN concepts c ON d.id = c.doc_id
        WHERE {where_clause}
        ORDER BY c.confidence DESC, d.created_at DESC
    """)
    
    rows = cur.fetchall()
    
    items = []
    seen_docs = set()
    
    for row in rows:
        doc_id, title, created_at, summary, concept_label, confidence = row
        
        # Avoid duplicates
        if doc_id in seen_docs:
            continue
        seen_docs.add(doc_id)
        
        items.append({
            "id": doc_id,
            "title": title,
            "created_at": created_at,
            "summary": summary[:100] if summary else None,
            "concept": concept_label,
            "confidence": confidence
        })
    
    folder_name_map = {
        "projects": "Projects",
        "concepts": "Concepts & Topics",
        "financial": "Financial Reports",
        "research": "Research & Analysis",
        "ai_tech": "AI & Tech"
    }
    
    return {
        "folder_name": folder_name_map.get(category, category.title()),
        "category": category,
        "items": items
    }

