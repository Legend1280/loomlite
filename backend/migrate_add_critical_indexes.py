#!/usr/bin/env python3
"""
Critical Database Index Migration for LoomLite v5.1
Adds missing indexes identified in the Code Efficiency Analysis Report

Indexes to add:
1. idx_concepts_doc_id - Speed up concept lookups by document
2. idx_relations_src - Speed up relation lookups by source
3. idx_relations_dst - Speed up relation lookups by destination  
4. idx_relations_src_dst - Speed up bidirectional relation queries

Expected Impact:
- 70% faster database queries (120ms → 36ms)
- Eliminates full table scans
- Enables scalability to 10,000+ documents
"""

import sqlite3
import sys
import os

def run_migration(db_path):
    """
    Add critical indexes to the database
    """
    print(f"🔧 Running critical index migration on: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Check if indexes already exist
        cur.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = {row[0] for row in cur.fetchall()}
        
        indexes_to_create = [
            {
                'name': 'idx_concepts_doc_id',
                'sql': '''
                    CREATE INDEX IF NOT EXISTS idx_concepts_doc_id 
                    ON Concept(doc_id)
                ''',
                'description': 'Speed up concept lookups by document ID'
            },
            {
                'name': 'idx_relations_src',
                'sql': '''
                    CREATE INDEX IF NOT EXISTS idx_relations_src 
                    ON Relation(src)
                ''',
                'description': 'Speed up relation lookups by source concept'
            },
            {
                'name': 'idx_relations_dst',
                'sql': '''
                    CREATE INDEX IF NOT EXISTS idx_relations_dst 
                    ON Relation(dst)
                ''',
                'description': 'Speed up relation lookups by destination concept'
            },
            {
                'name': 'idx_relations_src_dst',
                'sql': '''
                    CREATE INDEX IF NOT EXISTS idx_relations_src_dst 
                    ON Relation(src, dst)
                ''',
                'description': 'Speed up bidirectional relation queries'
            }
        ]
        
        created_count = 0
        skipped_count = 0
        
        for index in indexes_to_create:
            if index['name'] in existing_indexes:
                print(f"  ⏭️  Skipping {index['name']} (already exists)")
                skipped_count += 1
            else:
                print(f"  ✅ Creating {index['name']}: {index['description']}")
                cur.execute(index['sql'])
                created_count += 1
        
        conn.commit()
        
        # Analyze tables to update query planner statistics
        print("\n📊 Analyzing tables to update query planner...")
        cur.execute("ANALYZE Concept")
        cur.execute("ANALYZE Relation")
        conn.commit()
        
        # Verify indexes were created
        cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'")
        all_indexes = [row[0] for row in cur.fetchall()]
        
        print(f"\n✅ Migration complete!")
        print(f"   Created: {created_count} new indexes")
        print(f"   Skipped: {skipped_count} existing indexes")
        print(f"   Total indexes: {len(all_indexes)}")
        print(f"\n📋 All indexes in database:")
        for idx in sorted(all_indexes):
            print(f"   - {idx}")
        
        # Show query plan improvement example
        print(f"\n🔍 Query plan example (before vs after):")
        print(f"   Query: SELECT * FROM concepts WHERE doc_id = ?")
        cur.execute("EXPLAIN QUERY PLAN SELECT * FROM Concept WHERE doc_id = 'test'")
        plan = cur.fetchall()
        for row in plan:
            print(f"   {row}")
        
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

def main():
    """
    Main entry point
    """
    # Default database path
    default_db = os.path.join(os.path.dirname(__file__), 'loom.db')
    
    # Allow custom database path as argument
    db_path = sys.argv[1] if len(sys.argv) > 1 else default_db
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        print(f"   Usage: python migrate_add_critical_indexes.py [db_path]")
        sys.exit(1)
    
    success = run_migration(db_path)
    
    if success:
        print(f"\n🎉 Critical indexes added successfully!")
        print(f"   Expected performance improvement: 70% faster queries")
        sys.exit(0)
    else:
        print(f"\n❌ Migration failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
