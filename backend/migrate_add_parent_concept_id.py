"""
Database Migration: Add parent_concept_id column for intra-cluster hierarchy
Version: v2.3.2
"""

import sqlite3
import os

DB_PATH = os.environ.get("DATABASE_PATH", "/data/loom_lite_v2.db")

def migrate():
    """Add parent_concept_id column to concepts table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if column already exists
        cursor.execute("PRAGMA table_info(concepts)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if "parent_concept_id" in columns:
            print("✅ parent_concept_id column already exists, skipping migration")
            return
        
        # Add parent_concept_id column
        cursor.execute("""
            ALTER TABLE concepts 
            ADD COLUMN parent_concept_id TEXT
        """)
        
        # Create index for faster lookups
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_concepts_parent_concept 
            ON concepts(parent_concept_id)
        """)
        
        conn.commit()
        print("✅ Added parent_concept_id column")
        print("✅ Created index on parent_concept_id")
        print("✅ Migration complete!")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

