"""
Database Migration: Add summary columns to documents and concepts tables
Version: v1.2 (ONTOLOGY_STANDARD v1.2)
"""

import sqlite3
import os

DB_DIR = os.getenv("DB_DIR", "/data")
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")

def migrate():
    """Add summary columns to support document and cluster summarization"""
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("🔄 Starting migration: Add summary columns...")
    
    # Check if columns already exist
    cursor.execute("PRAGMA table_info(documents)")
    doc_columns = [col[1] for col in cursor.fetchall()]
    
    cursor.execute("PRAGMA table_info(concepts)")
    concept_columns = [col[1] for col in cursor.fetchall()]
    
    changes = []
    
    # Add summary to documents table
    if 'summary' not in doc_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN summary TEXT")
        changes.append("✅ Added summary column to documents table")
        print("   Added summary column to documents table")
    else:
        print("   ⏭️  summary column already exists in documents table")
    
    # Add summary to concepts table
    if 'summary' not in concept_columns:
        cursor.execute("ALTER TABLE concepts ADD COLUMN summary TEXT")
        changes.append("✅ Added summary column to concepts table")
        print("   Added summary column to concepts table")
    else:
        print("   ⏭️  summary column already exists in concepts table")
    
    conn.commit()
    conn.close()
    
    if changes:
        print(f"\n✅ Migration complete! {len(changes)} changes applied.")
        for change in changes:
            print(f"   {change}")
    else:
        print("\n✅ Migration complete! No changes needed (already up to date).")
    
    return {
        "status": "success",
        "changes": changes
    }

if __name__ == "__main__":
    migrate()

