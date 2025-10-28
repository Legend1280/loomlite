"""
Migration: Add provenance_events table for document lineage tracking
LoomLite v4.1 - Provenance Pipeline
"""

import sqlite3
import os

def run_migration(db_path: str = "/data/loom_lite_v2.db"):
    """Create provenance_events table for tracking document transformation pipeline"""
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # Create provenance_events table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS provenance_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                actor TEXT,
                checksum TEXT,
                semantic_integrity REAL,
                derived_from TEXT,
                metadata TEXT,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_doc 
            ON provenance_events(doc_id)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_timestamp 
            ON provenance_events(timestamp DESC)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_event_type 
            ON provenance_events(event_type)
        """)
        
        conn.commit()
        print("✅ Migration complete: provenance_events table created")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    # For local testing
    db_path = os.getenv("DATABASE_PATH", "/data/loom_lite_v2.db")
    run_migration(db_path)

