#!/usr/bin/env python3
"""
Run migration on Railway production database via API
"""
import requests
import sys

# Create an admin endpoint to run migrations
BACKEND_URL = "https://loomlite-production.up.railway.app"

# Since we don't have a migration endpoint, we'll create the table via a direct SQL endpoint
# For now, let's just document what needs to be done

print("=" * 60)
print("MIGRATION NEEDED: Add saved_views table")
print("=" * 60)
print()
print("The saved_views table needs to be created on Railway.")
print("This can be done by:")
print()
print("1. SSH into Railway container and run:")
print("   python3 /app/backend/migrate_add_saved_views.py")
print()
print("2. Or add a migration endpoint to the API")
print()
print("SQL to execute:")
print("-" * 60)
print("""
CREATE TABLE saved_views (
    id TEXT PRIMARY KEY,
    view_name TEXT NOT NULL,
    query TEXT NOT NULL,
    sort_mode TEXT DEFAULT 'auto',
    created_at TEXT NOT NULL,
    user_id TEXT
);

CREATE INDEX idx_saved_views_user ON saved_views(user_id);
""")
print("-" * 60)
