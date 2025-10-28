#!/bin/bash
# LoomLite Startup Script
# Runs migrations before starting the API server

set -e

echo "🚀 Starting LoomLite..."

# Run v5.2 vector integration migration
echo "📦 Running v5.2 vector migration..."
python3 -c "
import sqlite3
import os

db_path = os.environ.get('DB_PATH', '/app/backend/loom_lite.db')
print(f'Database: {db_path}')

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Check and add Document columns
doc_cols = [col[1] for col in cur.execute('PRAGMA table_info(Document)').fetchall()]
if 'vector' not in doc_cols:
    cur.execute('ALTER TABLE Document ADD COLUMN vector BLOB')
    print('✅ Added Document.vector')
if 'vector_model' not in doc_cols:
    cur.execute('ALTER TABLE Document ADD COLUMN vector_model TEXT DEFAULT \"all-MiniLM-L6-v2\"')
    print('✅ Added Document.vector_model')
if 'vector_fingerprint' not in doc_cols:
    cur.execute('ALTER TABLE Document ADD COLUMN vector_fingerprint TEXT')
    print('✅ Added Document.vector_fingerprint')
if 'vector_dimension' not in doc_cols:
    cur.execute('ALTER TABLE Document ADD COLUMN vector_dimension INTEGER DEFAULT 384')
    print('✅ Added Document.vector_dimension')

# Check and add Concept columns
concept_cols = [col[1] for col in cur.execute('PRAGMA table_info(Concept)').fetchall()]
if 'vector' not in concept_cols:
    cur.execute('ALTER TABLE Concept ADD COLUMN vector BLOB')
    print('✅ Added Concept.vector')
if 'vector_model' not in concept_cols:
    cur.execute('ALTER TABLE Concept ADD COLUMN vector_model TEXT DEFAULT \"all-MiniLM-L6-v2\"')
    print('✅ Added Concept.vector_model')
if 'vector_fingerprint' not in concept_cols:
    cur.execute('ALTER TABLE Concept ADD COLUMN vector_fingerprint TEXT')
    print('✅ Added Concept.vector_fingerprint')
if 'vector_dimension' not in concept_cols:
    cur.execute('ALTER TABLE Concept ADD COLUMN vector_dimension INTEGER DEFAULT 384')
    print('✅ Added Concept.vector_dimension')

conn.commit()
conn.close()
print('✅ Migration complete')
"

# Start the API server
echo "🌐 Starting API server..."
exec uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-8000}
