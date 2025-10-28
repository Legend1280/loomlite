"""
Provenance Event Logging Module
Tracks document transformation pipeline for audit and lineage
"""

import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any

def log_provenance_event(
    db_path: str,
    doc_id: str,
    event_type: str,
    actor: Optional[str] = None,
    checksum: Optional[str] = None,
    semantic_integrity: Optional[float] = None,
    derived_from: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    """
    Log a provenance event to the database
    
    Args:
        db_path: Path to SQLite database
        doc_id: Document identifier
        event_type: Type of event (ingested, extracted, transformed, etc.)
        actor: Who/what performed the action (user_id, model_name, etc.)
        checksum: Document checksum at this point in pipeline
        semantic_integrity: Confidence/quality score (0.0-1.0)
        derived_from: Parent document ID if this is a transformation
        metadata: Additional event-specific data (JSON)
    """
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        metadata_json = json.dumps(metadata) if metadata else None
        
        cur.execute("""
            INSERT INTO provenance_events 
            (doc_id, event_type, timestamp, actor, checksum, semantic_integrity, derived_from, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (doc_id, event_type, timestamp, actor, checksum, semantic_integrity, derived_from, metadata_json))
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        print(f"Error logging provenance event: {e}")
        raise
    
    finally:
        conn.close()


def get_provenance_events(db_path: str, doc_id: str) -> list:
    """
    Retrieve all provenance events for a document
    
    Args:
        db_path: Path to SQLite database
        doc_id: Document identifier
        
    Returns:
        List of provenance events ordered by timestamp
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    try:
        events = cur.execute("""
            SELECT * FROM provenance_events 
            WHERE doc_id = ? 
            ORDER BY timestamp ASC
        """, (doc_id,)).fetchall()
        
        result = []
        for event in events:
            event_dict = dict(event)
            # Parse metadata JSON if present
            if event_dict.get('metadata'):
                event_dict['metadata'] = json.loads(event_dict['metadata'])
            result.append(event_dict)
        
        return result
        
    finally:
        conn.close()


def get_provenance_summary(db_path: str, doc_id: str) -> Dict[str, Any]:
    """
    Get provenance summary for a document
    
    Args:
        db_path: Path to SQLite database
        doc_id: Document identifier
        
    Returns:
        Summary dict with event count, actors, integrity scores
    """
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    try:
        # Get event count and unique actors
        summary = cur.execute("""
            SELECT 
                COUNT(*) as event_count,
                COUNT(DISTINCT actor) as actor_count,
                AVG(semantic_integrity) as avg_integrity,
                MIN(timestamp) as first_event,
                MAX(timestamp) as last_event
            FROM provenance_events 
            WHERE doc_id = ?
        """, (doc_id,)).fetchone()
        
        # Get unique event types
        event_types = cur.execute("""
            SELECT DISTINCT event_type 
            FROM provenance_events 
            WHERE doc_id = ?
        """, (doc_id,)).fetchall()
        
        return {
            'event_count': summary['event_count'] if summary else 0,
            'actor_count': summary['actor_count'] if summary else 0,
            'avg_integrity': summary['avg_integrity'] if summary else None,
            'first_event': summary['first_event'] if summary else None,
            'last_event': summary['last_event'] if summary else None,
            'event_types': [et['event_type'] for et in event_types]
        }
        
    finally:
        conn.close()

