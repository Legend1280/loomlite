"""
Migration: Create provenance_events table with hash chain support
Version: 2.0
Purpose: Enable full vector provenance tracking with verification
"""

import sqlite3
import sys

def migrate_provenance_v2(db_path: str = "loom_lite.db"):
    """
    Create or update provenance_events table with hash chain support
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("🔄 Starting provenance v2.0 migration...")
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='provenance_events'
        """)
        table_exists = cursor.fetchone() is not None
        
        if not table_exists:
            print("📝 Creating provenance_events table...")
            cursor.execute("""
                CREATE TABLE provenance_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doc_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    actor TEXT,
                    checksum TEXT,
                    semantic_integrity REAL,
                    derived_from TEXT,
                    metadata TEXT,
                    vector_hash TEXT,
                    parent_hash TEXT,
                    verified INTEGER DEFAULT 0,
                    FOREIGN KEY (doc_id) REFERENCES Document(id)
                )
            """)
            print("✅ Created provenance_events table")
        else:
            print("✅ provenance_events table already exists")
            
            # Check if vector_hash column exists
            cursor.execute("PRAGMA table_info(provenance_events)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'vector_hash' not in columns:
                print("📝 Adding vector_hash column...")
                cursor.execute("""
                    ALTER TABLE provenance_events 
                    ADD COLUMN vector_hash TEXT
                """)
                print("✅ Added vector_hash column")
            
            if 'parent_hash' not in columns:
                print("📝 Adding parent_hash column...")
                cursor.execute("""
                    ALTER TABLE provenance_events 
                    ADD COLUMN parent_hash TEXT
                """)
                print("✅ Added parent_hash column")
            
            if 'verified' not in columns:
                print("📝 Adding verified column...")
                cursor.execute("""
                    ALTER TABLE provenance_events 
                    ADD COLUMN verified INTEGER DEFAULT 0
                """)
                print("✅ Added verified column")
        
        # Create indexes for performance
        print("📝 Creating indexes...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_doc_id 
            ON provenance_events(doc_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_timestamp 
            ON provenance_events(timestamp)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_event_type 
            ON provenance_events(event_type)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_provenance_vector_hash 
            ON provenance_events(vector_hash)
        """)
        print("✅ Created indexes")
        
        conn.commit()
        print("✅ Provenance v2.0 migration complete!")
        
        return {
            "status": "success",
            "table_created": not table_exists,
            "columns_added": ['vector_hash', 'parent_hash', 'verified'] if table_exists else []
        }
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else "loom_lite.db"
    result = migrate_provenance_v2(db_path)
    print(f"\nResult: {result}")
