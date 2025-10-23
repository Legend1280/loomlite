# Loom Lite Ontology Development Standard

**Version:** 1.1.0  
**Last Updated:** 2025-10-22  
**Status:** CANONICAL - DO NOT DEVIATE

## ⚠️ CRITICAL: System Integrity

This document defines the canonical ontological structure for Loom Lite. Any deviation from this standard risks complete system degradation. All future development MUST adhere to this specification.

**If you need to modify the ontology structure:**
1. Create a new version of this document
2. Increment the version number
3. Document all changes and migration paths
4. Update all dependent code simultaneously
5. Test backwards compatibility

---

## 1. Core Ontology Principles

### 1.1 Ontology-First Architecture
- Documents are containers for micro-ontologies
- Concepts are first-class entities with unique IDs
- Relations are typed edges between concepts
- Spans are provenance anchors to source text
- Mentions link concepts to evidence with confidence scores

### 1.2 Immutability
- Once extracted, ontologies are versioned, not mutated
- Re-extraction creates new ontology versions
- Historical versions are preserved for comparison

### 1.3 Provenance
- Every concept MUST link to source text via spans
- Character-level offsets are REQUIRED (not line numbers)
- Extraction metadata (model, pipeline, timestamp) is MANDATORY

---

## 2. MicroOntology Object Structure

This is the canonical JSON schema. Do not add, remove, or rename fields without versioning.

```json
{
  "doc": {
    "id": "doc_<checksum_prefix>",
    "title": "string",
    "source_uri": "file://... or https://...",
    "mime": "application/pdf | text/markdown | ...",
    "checksum": "sha256:...",
    "bytes": 123456,
    "created_at": "ISO8601 timestamp",
    "updated_at": "ISO8601 timestamp"
  },
  "version": {
    "id": "ver_<doc_id>_<timestamp>",
    "model_name": "gpt-5",
    "model_version": "2025-10-22",
    "pipeline": "ingest+extract@v0.3.0",
    "extracted_at": "ISO8601 timestamp",
    "notes": "optional extraction notes"
  },
  "spans": [
    {
      "id": "s_<doc_id>_<index>",
      "start": 0,
      "end": 100,
      "text": "exact text excerpt",
      "page_hint": 1,
      "extractor": "openai@gpt-5",
      "quality": 0.0-1.0
    }
  ],
  "concepts": [
    {
      "id": "c_<doc_id>_<index>",
      "label": "Concept Name",
      "type": "Person|Project|Date|Metric|Technology|Feature|Process|Topic|Team",
      "confidence": 0.0-1.0,
      "aliases": ["Alternative Name"],
      "tags": ["tag1", "tag2"],
      "model_name": "gpt-5",
      "prompt_ver": "v1.0"
    }
  ],
  "relations": [
    {
      "id": "r_<doc_id>_<index>",
      "src": "c_<concept_id>",
      "rel": "defines|depends_on|owns|leads|enables|...",
      "dst": "c_<concept_id>",
      "confidence": 0.0-1.0,
      "model_name": "gpt-5"
    }
  ],
  "mentions": [
    {
      "id": "m_<doc_id>_<index>",
      "concept_id": "c_<concept_id>",
      "span_id": "s_<span_id>",
      "confidence": 0.0-1.0
    }
  ]
}
```

---

## 3. Concept Types (Fixed Taxonomy)

**DO NOT add new types without updating this document.**

| Type | Description | Examples |
|------|-------------|----------|
| Person | Individual human | Brady Simmons, John Doe |
| Project | Named initiative | Loom Lite, Project Alpha |
| Date | Temporal reference | Q4 2024, January 2025 |
| Metric | Measurable value | Revenue Model, User Count |
| Technology | Technical system | OpenAI, PostgreSQL, React |
| Feature | Product capability | Semantic Search, Auto-tagging |
| Process | Workflow/procedure | Extraction Pipeline, Review Process |
| Topic | Subject matter | Healthcare, Finance, AI |
| Team | Organizational unit | Engineering Team, Sales Dept |

**Adding new types requires:**
1. Update this table
2. Update database schema enum
3. Update frontend color mapping
4. Update extraction prompt
5. Increment version to 1.2.0

---

## 4. Relation Verbs (Fixed Vocabulary)

**DO NOT add new verbs without updating this document.**

| Verb | Meaning | Example |
|------|---------|---------|
| defines | A defines B | Subscription Pricing defines Revenue Model |
| depends_on | A requires B | Feature X depends_on Technology Y |
| owns | A owns/created B | Brady Simmons owns Loom Lite |
| leads | A manages B | Manager leads Team |
| enables | A makes B possible | Semantic Search enables Discovery |
| supports | A assists B | API supports Integration |
| contains | A includes B | Document contains Section |
| measures | A quantifies B | Metric measures Performance |
| precedes | A comes before B | Phase 1 precedes Phase 2 |
| provides | A supplies B | Service provides Data |
| uses | A utilizes B | System uses OpenAI |
| develops | A creates B | Team develops Feature |
| occurs_on | A happens at B | Event occurs_on Date |
| triggers | A causes B | Action triggers Workflow |
| displays | A shows B | Dashboard displays Metrics |
| controls | A manages B | Admin controls Access |
| shows | A demonstrates B | Report shows Results |
| performs | A executes B | Agent performs Task |
| ensures | A guarantees B | Process ensures Quality |
| powers | A drives B | Engine powers Application |
| produces | A generates B | Pipeline produces Output |

**Adding new verbs requires:**
1. Update this table
2. Update extraction prompt
3. Update visualization legend
4. Increment version to 1.2.0

---

## 5. Database Schema (Canonical)

**File:** `backend/schema_v2.sql`

### 5.1 Core Tables

```sql
-- Documents table
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    source_uri TEXT,
    mime TEXT,
    checksum TEXT,
    bytes INTEGER,
    created_at TEXT,
    updated_at TEXT
);

-- Ontology versions table
CREATE TABLE ontology_versions (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    model_name TEXT,
    model_version TEXT,
    pipeline TEXT,
    extracted_at TEXT,
    notes TEXT,
    FOREIGN KEY (doc_id) REFERENCES documents(id)
);

-- Spans table (evidence)
CREATE TABLE spans (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    start INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    text TEXT,
    page_hint INTEGER,
    extractor TEXT,
    quality REAL,
    FOREIGN KEY (doc_id) REFERENCES documents(id)
);

-- Concepts table
CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    confidence REAL,
    aliases TEXT,
    tags TEXT,
    model_name TEXT,
    prompt_ver TEXT,
    FOREIGN KEY (doc_id) REFERENCES documents(id)
);

-- Relations table
CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    src TEXT NOT NULL,
    rel TEXT NOT NULL,
    dst TEXT NOT NULL,
    confidence REAL,
    model_name TEXT,
    FOREIGN KEY (doc_id) REFERENCES documents(id),
    FOREIGN KEY (src) REFERENCES concepts(id),
    FOREIGN KEY (dst) REFERENCES concepts(id)
);

-- Mentions table (concept-span links)
CREATE TABLE mentions (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    confidence REAL,
    FOREIGN KEY (concept_id) REFERENCES concepts(id),
    FOREIGN KEY (doc_id) REFERENCES documents(id),
    FOREIGN KEY (span_id) REFERENCES spans(id)
);
```

### 5.2 Required Indexes

```sql
CREATE INDEX idx_concepts_doc ON concepts(doc_id);
CREATE INDEX idx_concepts_type ON concepts(type);
CREATE INDEX idx_concepts_label ON concepts(label);
CREATE INDEX idx_relations_src ON relations(src);
CREATE INDEX idx_relations_dst ON relations(dst);
CREATE INDEX idx_relations_doc ON relations(doc_id);
CREATE INDEX idx_spans_doc ON spans(doc_id);
CREATE INDEX idx_mentions_concept ON mentions(concept_id);
CREATE INDEX idx_mentions_span ON mentions(span_id);
```

**DO NOT drop or modify these indexes without performance testing.**

---

## 6. Extraction Pipeline (Canonical Process)

### 6.1 Pipeline Stages

```
Input Document
    ↓
[1] Document Reading
    ├─ Parse file (PDF/DOCX/MD/TXT)
    ├─ Extract text
    ├─ Calculate checksum
    └─ Generate doc_id
    ↓
[2] Text Chunking
    ├─ Split into 1500-char chunks
    ├─ 200-char overlap
    └─ Track character offsets
    ↓
[3] LLM Extraction (per chunk)
    ├─ Call OpenAI API (GPT-5)
    ├─ Extract concepts (10-20 per chunk)
    ├─ Extract relations
    └─ Merge across chunks
    ↓
[4] Span Creation
    ├─ Find concept mentions in text
    ├─ Record character offsets
    └─ Link to concepts
    ↓
[5] Database Storage
    ├─ Insert document
    ├─ Insert ontology version
    ├─ Insert spans
    ├─ Insert concepts
    ├─ Insert relations
    └─ Insert mentions
    ↓
Output: MicroOntology
```

### 6.2 Pipeline Version

**Current:** `ingest+extract@v0.3.0`

**Components:**
- `reader.py` - Document parsing
- `extractor.py` - LLM extraction (GPT-5)
- `api.py` - Unified API with job queue

**DO NOT modify pipeline without:**
1. Incrementing version number
2. Testing on existing documents
3. Verifying backwards compatibility

---

## 7. API Endpoints (Canonical)

### 7.1 Unified API (Railway Deployment)

**Base URL:** `https://loomlite-production.up.railway.app`

#### Ontology Query Endpoints

```
GET  /                              - API info
GET  /tree                          - Get all documents
GET  /doc/{doc_id}/ontology         - Get MicroOntology
GET  /search?q=...&types=...&tags=  - Search concepts
GET  /jump?doc_id=...&concept_id=   - Get evidence
GET  /concepts?types=...            - List concepts
GET  /tags                          - List all tags
```

#### N8N Integration Endpoints

```
POST   /api/ingest                  - Upload document (JSON with base64)
POST   /api/ingest/file             - Upload document (multipart)
GET    /api/jobs/{job_id}           - Get job status
GET    /api/jobs                    - List all jobs
DELETE /api/jobs/{job_id}           - Delete job
```

**DO NOT change endpoint paths without:**
1. Updating N8N workflows
2. Updating frontend code
3. Documenting in CHANGELOG

---

## 8. Code Organization (Canonical Structure)

```
loom-lite-mvp/
├── backend/
│   ├── schema_v2.sql           # Database schema (CANONICAL)
│   ├── models.py               # Pydantic models (CANONICAL)
│   ├── reader.py               # Document parsing
│   ├── extractor.py            # LLM extraction (GPT-5)
│   ├── api.py                  # Unified API (Railway)
│   ├── sample_data_v2.py       # Sample data generator
│   └── loom_lite_v2.db         # SQLite database
├── frontend/
│   └── index.html              # UI (Vercel deployment)
├── n8n_workflows/
│   └── *.json                  # N8N workflow templates
├── docs/
│   ├── N8N_INTEGRATION_GUIDE.md
│   └── screenshots/
├── ONTOLOGY_STANDARD_v1.1.md   # THIS FILE (CANONICAL)
├── VERCEL_DEPLOYMENT.md        # Deployment guide
└── README.md                   # User guide
```

**DO NOT reorganize without updating all import paths.**

---

## 9. Deployment Architecture

### 9.1 Production Stack

**Backend (Railway):**
- Platform: Railway
- URL: https://loomlite-production.up.railway.app
- Runtime: Python 3.11
- Database: SQLite (persistent volume)
- Environment Variables: `OPENAI_API_KEY`

**Frontend (Vercel):**
- Platform: Vercel
- URL: https://loomlite-ceiwo6txb-bradys-projects-179e6527.vercel.app
- Framework: Static HTML/JS
- API Connection: Points to Railway backend

**CI/CD:**
- GitHub repository: `Legend1280/loomlite`
- Auto-deploy on push to `main` branch
- Both Railway and Vercel watch the repository

### 9.2 Environment Variables

**Required for Backend:**
```bash
OPENAI_API_KEY=sk-...    # OpenAI API key for GPT-5
DATABASE_PATH=./loom_lite_v2.db  # SQLite database path
```

---

## 10. Testing Requirements

### 10.1 Before Any Ontology Change

**MUST run these tests:**

```bash
# 1. Extract sample document
cd ~/loom-lite-mvp/backend
python3.11 extractor.py ../test_doc.md "Test Document"

# 2. Verify MicroOntology structure
python3.11 << 'EOF'
from models import MicroOntology
import sqlite3
import json

conn = sqlite3.connect("loom_lite_v2.db")
conn.row_factory = sqlite3.Row
doc = conn.execute("SELECT * FROM documents ORDER BY created_at DESC LIMIT 1").fetchone()
conn.close()

# This MUST NOT raise validation errors
ontology = MicroOntology.from_db(doc["id"])
print(f"✅ Valid MicroOntology: {len(ontology.concepts)} concepts")
EOF

# 3. Test API endpoints
curl https://loomlite-production.up.railway.app/tree | jq
curl https://loomlite-production.up.railway.app/doc/<doc_id>/ontology | jq
curl https://loomlite-production.up.railway.app/search?q=test | jq

# 4. Test N8N API
curl https://loomlite-production.up.railway.app/api/jobs | jq
```

### 10.2 Regression Tests

**MUST verify:**
- Existing documents still load
- Concept types are recognized
- Relations are valid
- Spans have correct offsets
- Frontend visualization works

---

## 11. Version Control

### 11.1 Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes to ontology structure
- **MINOR:** New concept types or relation verbs
- **PATCH:** Bug fixes, no schema changes

### 11.2 Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-22 | Initial canonical standard |
| 1.1.0 | 2025-10-22 | Updated for unified API, GPT-5, Railway/Vercel deployment |

---

## 12. Migration Guide

### 12.1 When to Migrate

**Migrate when:**
- Adding new concept types
- Adding new relation verbs
- Changing database schema
- Modifying MicroOntology structure

### 12.2 Migration Process

1. Create migration script: `migrations/v1.1_to_v1.2.sql`
2. Test on copy of production DB
3. Document breaking changes
4. Update this document
5. Increment version number
6. Deploy with rollback plan

---

## 13. Common Pitfalls (DO NOT DO THIS)

❌ **Adding concept types in code without updating schema**  
→ Result: Database rejects inserts, extraction fails

❌ **Changing span offset calculation**  
→ Result: Evidence links break, provenance lost

❌ **Modifying MicroOntology JSON structure**  
→ Result: Frontend breaks, API clients fail

❌ **Skipping ontology versioning**  
→ Result: Cannot compare extractions, lost history

❌ **Using line numbers instead of character offsets**  
→ Result: Provenance breaks when document reformatted

❌ **Storing concepts without spans**  
→ Result: No evidence, claims unverifiable

---

## 14. Contact & Governance

**Ontology Maintainer:** Brady Simmons  
**Last Review:** 2025-10-22  
**Next Review:** Before any schema change

**To propose changes:**
1. Open issue describing change
2. Provide use case and examples
3. Submit migration plan
4. Get approval before implementation

---

## 15. Summary

This document is the source of truth for Loom Lite ontology structure.

**Key takeaways:**
- ✅ MicroOntology JSON schema is fixed
- ✅ Concept types are enumerated
- ✅ Relation verbs are controlled vocabulary
- ✅ Database schema is canonical
- ✅ Character offsets are mandatory
- ✅ Versioning is required
- ✅ GPT-5 is the current extraction model
- ✅ Unified API architecture on Railway
- ✅ Frontend deployed on Vercel

**When in doubt:**
1. Refer to this document
2. Check `models.py` for Pydantic validation
3. Review `schema_v2.sql` for database constraints
4. Test with existing documents

**System integrity depends on adherence to this standard.**

---

**END OF CANONICAL SPECIFICATION**

