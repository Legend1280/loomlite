"""
Analytics Module for LoomLite v3.3
Tracks folder and document engagement metrics
"""

import sqlite3
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid


def track_folder_view(
    conn: sqlite3.Connection,
    folder_name: str,
    doc_id: str
) -> None:
    """
    Track a folder/document view event
    Increments view_count and updates last_opened
    """
    cur = conn.cursor()
    
    # Check if record exists
    cur.execute("""
        SELECT id, view_count FROM folder_stats
        WHERE folder_name = ? AND doc_id = ?
    """, (folder_name, doc_id))
    
    row = cur.fetchone()
    now = datetime.now().isoformat()
    
    if row:
        # Update existing record
        stat_id, view_count = row
        cur.execute("""
            UPDATE folder_stats
            SET view_count = ?,
                last_opened = ?,
                updated_at = ?
            WHERE id = ?
        """, (view_count + 1, now, now, stat_id))
    else:
        # Create new record
        stat_id = f"stat_{uuid.uuid4().hex[:12]}"
        cur.execute("""
            INSERT INTO folder_stats (
                id, folder_name, doc_id, view_count, last_opened, updated_at
            ) VALUES (?, ?, ?, 1, ?, ?)
        """, (stat_id, folder_name, doc_id, now, now))
    
    conn.commit()


def track_pin_event(
    conn: sqlite3.Connection,
    folder_name: str,
    doc_id: str
) -> None:
    """
    Track a pin event for a folder/document
    Increments pin_count
    """
    cur = conn.cursor()
    
    # Check if record exists
    cur.execute("""
        SELECT id, pin_count FROM folder_stats
        WHERE folder_name = ? AND doc_id = ?
    """, (folder_name, doc_id))
    
    row = cur.fetchone()
    now = datetime.now().isoformat()
    
    if row:
        # Update existing record
        stat_id, pin_count = row
        cur.execute("""
            UPDATE folder_stats
            SET pin_count = ?,
                updated_at = ?
            WHERE id = ?
        """, (pin_count + 1, now, stat_id))
    else:
        # Create new record with pin
        stat_id = f"stat_{uuid.uuid4().hex[:12]}"
        cur.execute("""
            INSERT INTO folder_stats (
                id, folder_name, doc_id, pin_count, updated_at
            ) VALUES (?, ?, ?, 1, ?)
        """, (stat_id, folder_name, doc_id, now))
    
    conn.commit()


def update_dwell_time(
    conn: sqlite3.Connection,
    folder_name: str,
    doc_id: str,
    seconds: int
) -> None:
    """
    Update dwell time for a folder/document
    Adds to existing dwell_time
    """
    cur = conn.cursor()
    
    # Check if record exists
    cur.execute("""
        SELECT id, dwell_time FROM folder_stats
        WHERE folder_name = ? AND doc_id = ?
    """, (folder_name, doc_id))
    
    row = cur.fetchone()
    now = datetime.now().isoformat()
    
    if row:
        # Update existing record
        stat_id, dwell_time = row
        cur.execute("""
            UPDATE folder_stats
            SET dwell_time = ?,
                updated_at = ?
            WHERE id = ?
        """, (dwell_time + seconds, now, stat_id))
    else:
        # Create new record with dwell time
        stat_id = f"stat_{uuid.uuid4().hex[:12]}"
        cur.execute("""
            INSERT INTO folder_stats (
                id, folder_name, doc_id, dwell_time, updated_at
            ) VALUES (?, ?, ?, ?, ?)
        """, (stat_id, folder_name, doc_id, seconds, now))
    
    conn.commit()


def get_folder_stats(
    conn: sqlite3.Connection,
    folder_name: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get analytics summary for folders
    If folder_name is provided, returns stats for that folder only
    """
    cur = conn.cursor()
    
    if folder_name:
        sql = """
            SELECT 
                folder_name,
                COUNT(DISTINCT doc_id) as doc_count,
                SUM(view_count) as total_views,
                SUM(pin_count) as total_pins,
                AVG(dwell_time) as avg_dwell_time,
                MAX(last_opened) as last_opened
            FROM folder_stats
            WHERE folder_name = ?
            GROUP BY folder_name
        """
        cur.execute(sql, (folder_name,))
    else:
        sql = """
            SELECT 
                folder_name,
                COUNT(DISTINCT doc_id) as doc_count,
                SUM(view_count) as total_views,
                SUM(pin_count) as total_pins,
                AVG(dwell_time) as avg_dwell_time,
                MAX(last_opened) as last_opened
            FROM folder_stats
            GROUP BY folder_name
            ORDER BY total_views DESC
        """
        cur.execute(sql)
    
    rows = cur.fetchall()
    
    stats = []
    for row in rows:
        folder_name, doc_count, total_views, total_pins, avg_dwell_time, last_opened = row
        stats.append({
            "folder_name": folder_name,
            "doc_count": doc_count,
            "total_views": total_views or 0,
            "total_pins": total_pins or 0,
            "avg_dwell_time": round(avg_dwell_time or 0, 1),
            "last_opened": last_opened
        })
    
    return stats


def get_document_stats(
    conn: sqlite3.Connection,
    doc_id: str
) -> Dict[str, Any]:
    """
    Get analytics for a specific document across all folders
    """
    cur = conn.cursor()
    
    # Get aggregated stats
    cur.execute("""
        SELECT 
            SUM(view_count) as total_views,
            SUM(pin_count) as total_pins,
            SUM(dwell_time) as total_dwell_time,
            MAX(last_opened) as last_opened,
            COUNT(DISTINCT folder_name) as folder_count
        FROM folder_stats
        WHERE doc_id = ?
    """, (doc_id,))
    
    row = cur.fetchone()
    
    if not row or row[0] is None:
        return {
            "doc_id": doc_id,
            "total_views": 0,
            "total_pins": 0,
            "total_dwell_time": 0,
            "avg_dwell_time": 0,
            "last_opened": None,
            "folder_count": 0,
            "folders": []
        }
    
    total_views, total_pins, total_dwell_time, last_opened, folder_count = row
    
    # Get per-folder breakdown
    cur.execute("""
        SELECT 
            folder_name,
            view_count,
            pin_count,
            dwell_time,
            last_opened
        FROM folder_stats
        WHERE doc_id = ?
        ORDER BY view_count DESC
    """, (doc_id,))
    
    folder_rows = cur.fetchall()
    folders = []
    for folder_row in folder_rows:
        folder_name, view_count, pin_count, dwell_time, folder_last_opened = folder_row
        folders.append({
            "folder_name": folder_name,
            "view_count": view_count,
            "pin_count": pin_count,
            "dwell_time": dwell_time,
            "last_opened": folder_last_opened
        })
    
    return {
        "doc_id": doc_id,
        "total_views": total_views or 0,
        "total_pins": total_pins or 0,
        "total_dwell_time": total_dwell_time or 0,
        "avg_dwell_time": round((total_dwell_time or 0) / max(total_views or 1, 1), 1),
        "last_opened": last_opened,
        "folder_count": folder_count or 0,
        "folders": folders
    }


def get_trending_documents(
    conn: sqlite3.Connection,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Get trending documents based on recent views and engagement
    """
    cur = conn.cursor()
    
    # Calculate trend score: recent views + pins, weighted by recency
    cur.execute("""
        SELECT 
            fs.doc_id,
            d.title,
            SUM(fs.view_count) as total_views,
            SUM(fs.pin_count) as total_pins,
            MAX(fs.last_opened) as last_opened,
            (SUM(fs.view_count) + SUM(fs.pin_count) * 2) as trend_score
        FROM folder_stats fs
        JOIN documents d ON fs.doc_id = d.id
        WHERE fs.last_opened >= datetime('now', '-7 days')
        GROUP BY fs.doc_id, d.title
        ORDER BY trend_score DESC
        LIMIT ?
    """, (limit,))
    
    rows = cur.fetchall()
    
    trending = []
    for row in rows:
        doc_id, title, total_views, total_pins, last_opened, trend_score = row
        trending.append({
            "doc_id": doc_id,
            "title": title,
            "total_views": total_views or 0,
            "total_pins": total_pins or 0,
            "last_opened": last_opened,
            "trend_score": trend_score or 0
        })
    
    return trending

