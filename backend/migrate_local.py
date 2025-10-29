"""
Run all necessary migrations on local database
"""

import sqlite3
import os

# Local database path
DB_PATH = "./loom_lite_v2.db"

def migrate_provenance():
    """Add provenance_events table"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
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
        print("✅ provenance_events table created")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ provenance migration failed: {e}")
    finally:
        conn.close()

def migrate_summary():
    """Add summary columns to documents and concepts"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(documents)")
        doc_columns = [col[1] for col in cursor.fetchall()]
        
        cursor.execute("PRAGMA table_info(concepts)")
        concept_columns = [col[1] for col in cursor.fetchall()]
        
        # Add summary to documents table
        if 'summary' not in doc_columns:
            cursor.execute("ALTER TABLE documents ADD COLUMN summary TEXT")
            print("✅ Added summary column to documents table")
        else:
            print("⏭️  summary column already exists in documents table")
        
        # Add summary to concepts table
        if 'summary' not in concept_columns:
            cursor.execute("ALTER TABLE concepts ADD COLUMN summary TEXT")
            print("✅ Added summary column to concepts table")
        else:
            print("⏭️  summary column already exists in concepts table")
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        print(f"❌ summary migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print(f"🔄 Running migrations on {DB_PATH}...\n")
    migrate_provenance()
    migrate_summary()
    print("\n✅ All migrations complete!")
