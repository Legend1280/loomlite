"""
Run database migration remotely via HTTP endpoint
This allows running migrations on Railway without SSH access
"""

import os
from .migrate_add_provenance_events import run_migration

if __name__ == "__main__":
    db_path = os.getenv("DATABASE_PATH", "/data/loom_lite_v2.db")
    print(f"Running migration on database: {db_path}")
    run_migration(db_path)
    print("Migration complete!")

