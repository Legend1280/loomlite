#!/usr/bin/env python3
"""
Migration: Add saved_views table for Dynamic Folder System (v3.2)
"""
import sqlite3
import os

DB_DIR = os.getenv("DB_DIR", "/data")
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")

def migrate():
    """Add saved_views table"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Check if table already exists
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_views'")
    if cur.fetchone():
        print("✓ saved_views table already exists")
        conn.close()
        return
    
    print("Adding saved_views table...")
    
    cur.execute("""
        CREATE TABLE saved_views (
            id TEXT PRIMARY KEY,
            view_name TEXT NOT NULL,
            query TEXT NOT NULL,
            sort_mode TEXT DEFAULT 'auto',
            created_at TEXT NOT NULL,
            user_id TEXT
        )
    """)
    
    cur.execute("CREATE INDEX idx_saved_views_user ON saved_views(user_id)")
    
    conn.commit()
    conn.close()
    
    print("✓ saved_views table created successfully")

if __name__ == "__main__":
    migrate()

