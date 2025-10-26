#!/usr/bin/env python3
"""
Database Migration: Add text column to documents table
This migration adds support for storing full document text for the Surface Viewer feature
"""

import os
import sqlite3
from datetime import datetime

# Database path
DB_DIR = os.getenv("DB_DIR", "/data")
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")

def migrate():
    """Add text column to documents table"""
    print("🔄 Starting migration: Add text column to documents table")
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    try:
        # Check if text column already exists
        cur.execute("PRAGMA table_info(documents)")
        columns = [row[1] for row in cur.fetchall()]
        
        if 'text' in columns:
            print("✅ Migration already applied - text column exists")
            return
        
        # Add text column
        print("📝 Adding text column to documents table...")
        cur.execute("ALTER TABLE documents ADD COLUMN text TEXT")
        
        # For existing documents, reconstruct text from spans (best effort)
        print("🔄 Reconstructing text from spans for existing documents...")
        cur.execute("SELECT DISTINCT doc_id FROM spans")
        doc_ids = [row[0] for row in cur.fetchall()]
        
        for doc_id in doc_ids:
            # Get all spans ordered by position
            cur.execute(
                "SELECT start, end, text FROM spans WHERE doc_id = ? ORDER BY start",
                (doc_id,)
            )
            spans = cur.fetchall()
            
            if spans:
                # Reconstruct text from spans (with gaps filled)
                reconstructed = ""
                last_end = 0
                
                for start, end, span_text in spans:
                    # Fill gap with spaces if needed
                    if start > last_end:
                        reconstructed += " " * (start - last_end)
                    
                    # Add span text
                    reconstructed += span_text
                    last_end = end
                
                # Update document with reconstructed text
                cur.execute(
                    "UPDATE documents SET text = ? WHERE id = ?",
                    (reconstructed, doc_id)
                )
                print(f"  ✓ Reconstructed text for {doc_id} ({len(reconstructed)} chars)")
        
        conn.commit()
        print("✅ Migration completed successfully")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

