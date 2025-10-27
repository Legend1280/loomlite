"""
Migration: Add sort_weights table for adaptive auto-sort
LoomLite v3.3-t04
"""

import sqlite3
import os
from datetime import datetime

def run_migration(db_path: str = "/data/loom_lite_v2.db"):
    """Create sort_weights table and initialize with default weights"""
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # Create sort_weights table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sort_weights (
                id TEXT PRIMARY KEY,
                weight_confidence REAL DEFAULT 0.0,
                weight_relation REAL DEFAULT 0.0,
                weight_recency REAL DEFAULT 0.0,
                weight_hierarchy REAL DEFAULT 0.0,
                updated_at TEXT NOT NULL,
                notes TEXT
            )
        """)
        
        # Check if default weights exist
        cur.execute("SELECT COUNT(*) FROM sort_weights")
        count = cur.fetchone()[0]
        
        if count == 0:
            # Insert default weights (all zeros = use base formula)
            now = datetime.now().isoformat()
            cur.execute("""
                INSERT INTO sort_weights (
                    id, weight_confidence, weight_relation, weight_recency, weight_hierarchy, updated_at, notes
                ) VALUES (
                    'default', 0.0, 0.0, 0.0, 0.0, ?, 'Initial default weights'
                )
            """, (now,))
            print("✅ Default sort weights initialized")
        
        conn.commit()
        print("✅ Migration complete: sort_weights table created")
        
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

