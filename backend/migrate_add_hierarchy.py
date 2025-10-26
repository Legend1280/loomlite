"""
Database migration: Add semantic hierarchy fields to concepts table
Version: v2.3
"""

import sqlite3
import os

DB_DIR = os.getenv("DB_DIR", "/data")
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")


def migrate():
    """Add parent_cluster_id, hierarchy_level, and coherence to concepts table"""
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    print("🔄 Migrating database schema for semantic hierarchy...")
    
    try:
        # Check if columns already exist
        cur.execute("PRAGMA table_info(concepts)")
        columns = [row[1] for row in cur.fetchall()]
        
        # Add parent_cluster_id if not exists
        if "parent_cluster_id" not in columns:
            print("  Adding parent_cluster_id column...")
            cur.execute("ALTER TABLE concepts ADD COLUMN parent_cluster_id TEXT")
            print("  ✅ Added parent_cluster_id")
        else:
            print("  ℹ️  parent_cluster_id already exists")
        
        # Add hierarchy_level if not exists
        if "hierarchy_level" not in columns:
            print("  Adding hierarchy_level column...")
            cur.execute("ALTER TABLE concepts ADD COLUMN hierarchy_level INTEGER")
            print("  ✅ Added hierarchy_level")
        else:
            print("  ℹ️  hierarchy_level already exists")
        
        # Add coherence if not exists
        if "coherence" not in columns:
            print("  Adding coherence column...")
            cur.execute("ALTER TABLE concepts ADD COLUMN coherence REAL")
            print("  ✅ Added coherence")
        else:
            print("  ℹ️  coherence already exists")
        
        # Create index on parent_cluster_id for faster queries
        try:
            print("  Creating index on parent_cluster_id...")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_concepts_parent ON concepts(parent_cluster_id)")
            print("  ✅ Created index")
        except Exception as e:
            print(f"  ℹ️  Index might already exist: {e}")
        
        conn.commit()
        print("✅ Migration complete!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()

