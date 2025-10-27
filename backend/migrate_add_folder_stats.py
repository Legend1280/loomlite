"""
Migration: Add folder_stats table for analytics tracking
LoomLite v3.3-t02
"""

import sqlite3
import os

def run_migration(db_path: str = "/data/loom_lite_v2.db"):
    """Create folder_stats table for tracking engagement metrics"""
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # Create folder_stats table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS folder_stats (
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
        
        # Create indexes for performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_folder_stats_folder 
            ON folder_stats(folder_name)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_folder_stats_doc 
            ON folder_stats(doc_id)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_folder_stats_updated 
            ON folder_stats(updated_at DESC)
        """)
        
        conn.commit()
        print("✅ Migration complete: folder_stats table created")
        
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

