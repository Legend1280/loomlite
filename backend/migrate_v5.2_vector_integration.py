#!/usr/bin/env python3
"""
LoomLite v5.2 - Vector Integration Migration

Adds vector storage columns to Documents and Concepts tables.
Makes vectors a first-class property of ontology objects.

Usage:
    python3 migrate_v5.2_vector_integration.py [database_path]
"""

import sqlite3
import sys
from pathlib import Path

def migrate_v5_2(db_path: str):
    """Add vector columns to documents and concepts tables"""
    
    print(f"🔄 Starting v5.2 Vector Integration Migration...")
    print(f"📁 Database: {db_path}")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    # Check current schema
    tables = cur.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('Document', 'Concept')
    """).fetchall()
    
    if len(tables) < 2:
        print("❌ Error: Required tables (documents, concepts) not found")
        conn.close()
        return False
    
    print(f"✅ Found tables: {[t['name'] for t in tables]}")
    
    migrations_applied = 0
    
    # ==================== DOCUMENTS TABLE ====================
    
    print("\n📄 Migrating documents table...")
    
    # Check if vector column already exists
    doc_columns = [col[1] for col in cur.execute("PRAGMA table_info(Document)").fetchall()]
    
    if 'vector' not in doc_columns:
        print("  Adding vector columns...")
        try:
            cur.execute("ALTER TABLE Document ADD COLUMN vector BLOB")
            cur.execute("ALTER TABLE Document ADD COLUMN vector_fingerprint TEXT")
            cur.execute("ALTER TABLE Document ADD COLUMN vector_model TEXT DEFAULT 'all-MiniLM-L6-v2'")
            cur.execute("ALTER TABLE Document ADD COLUMN vector_dimension INTEGER DEFAULT 384")
            cur.execute("ALTER TABLE Document ADD COLUMN vector_generated_at TIMESTAMP")
            conn.commit()
            migrations_applied += 1
            print("  ✅ Added vector columns to documents")
        except sqlite3.Error as e:
            print(f"  ⚠️  Error adding columns: {e}")
            conn.rollback()
    else:
        print("  ℹ️  Vector columns already exist")
    
    # Add index on vector_fingerprint for fast lookups
    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_vector_fingerprint 
            ON Document(vector_fingerprint)
        """)
        conn.commit()
        print("  ✅ Added index on vector_fingerprint")
    except sqlite3.Error as e:
        print(f"  ⚠️  Error creating index: {e}")
    
    # ==================== CONCEPTS TABLE ====================
    
    print("\n🔷 Migrating concepts table...")
    
    # Check if vector column already exists
    concept_columns = [col[1] for col in cur.execute("PRAGMA table_info(Concept)").fetchall()]
    
    if 'vector' not in concept_columns:
        print("  Adding vector columns...")
        try:
            cur.execute("ALTER TABLE Concept ADD COLUMN vector BLOB")
            cur.execute("ALTER TABLE Concept ADD COLUMN vector_fingerprint TEXT")
            cur.execute("ALTER TABLE Concept ADD COLUMN vector_model TEXT DEFAULT 'all-MiniLM-L6-v2'")
            cur.execute("ALTER TABLE Concept ADD COLUMN vector_dimension INTEGER DEFAULT 384")
            cur.execute("ALTER TABLE Concept ADD COLUMN vector_generated_at TIMESTAMP")
            conn.commit()
            migrations_applied += 1
            print("  ✅ Added vector columns to concepts")
        except sqlite3.Error as e:
            print(f"  ⚠️  Error adding columns: {e}")
            conn.rollback()
    else:
        print("  ℹ️  Vector columns already exist")
    
    # Add index on vector_fingerprint for fast lookups
    try:
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_concepts_vector_fingerprint 
            ON Concept(vector_fingerprint)
        """)
        conn.commit()
        print("  ✅ Added index on vector_fingerprint")
    except sqlite3.Error as e:
        print(f"  ⚠️  Error creating index: {e}")
    
    # ==================== STATISTICS ====================
    
    print("\n📊 Migration Statistics:")
    
    # Count documents
    doc_count = cur.execute("SELECT COUNT(*) as count FROM Document").fetchone()['count']
    doc_with_vectors = cur.execute("""
        SELECT COUNT(*) as count FROM Document WHERE vector IS NOT NULL
    """).fetchone()['count']
    
    print(f"  Documents: {doc_count} total, {doc_with_vectors} with vectors ({doc_with_vectors/doc_count*100 if doc_count > 0 else 0:.1f}%)")
    
    # Count concepts
    concept_count = cur.execute("SELECT COUNT(*) as count FROM Concept").fetchone()['count']
    concept_with_vectors = cur.execute("""
        SELECT COUNT(*) as count FROM Concept WHERE vector IS NOT NULL
    """).fetchone()['count']
    
    print(f"  Concepts: {concept_count} total, {concept_with_vectors} with vectors ({concept_with_vectors/concept_count*100 if concept_count > 0 else 0:.1f}%)")
    
    # Analyze database
    print("\n🔍 Analyzing database...")
    cur.execute("ANALYZE")
    conn.commit()
    print("  ✅ Database analyzed")
    
    conn.close()
    
    print(f"\n✅ Migration complete! Applied {migrations_applied} schema changes")
    
    if doc_with_vectors < doc_count or concept_with_vectors < concept_count:
        print("\n⚠️  Note: Not all objects have vectors yet.")
        print("   Run batch_embed_documents.py to backfill vectors for existing objects.")
    
    return True

if __name__ == "__main__":
    # Default database path
    db_path = "loom_lite.db"
    
    # Allow custom path from command line
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    # Check if database exists
    if not Path(db_path).exists():
        print(f"❌ Error: Database not found at {db_path}")
        print(f"   Usage: python3 {sys.argv[0]} [database_path]")
        sys.exit(1)
    
    # Run migration
    success = migrate_v5_2(db_path)
    
    sys.exit(0 if success else 1)
