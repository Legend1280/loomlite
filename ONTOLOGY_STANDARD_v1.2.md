# Loom Lite Ontology Development Standard

**Version:** 1.2.0  
**Last Updated:** 2025-10-26  
**Status:** PROPOSED - PENDING REVIEW

---

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



## 2. MicroOntology Object Structure (v1.2)

This is the canonical JSON schema for v1.2. It introduces `summary` fields to the `doc` and `concepts` objects, and formalizes the hierarchy fields in the `concepts` object.

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
    "updated_at": "ISO8601 timestamp",
    "summary": "LLM-generated summary of the entire document."
  },
  "version": {
    "id": "ver_<doc_id>_<timestamp>",
    "model_name": "gpt-4.1-mini",
    "model_version": "2025-10-26",
    "pipeline": "ingest+extract@v2.4.0",
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
      "extractor": "openai@gpt-4.1-mini",
      "quality": 0.0-1.0
    }
  ],
  "concepts": [
    {
      "id": "c_<doc_id>_<index>",
      "label": "Concept Name",
      "type": "Person|Project|Date|Metric|Technology|Feature|Process|Topic|Team|Cluster|Refinement",
      "confidence": 0.0-1.0,
      "aliases": ["Alternative Name"],
      "tags": ["tag1", "tag2"],
      "model_name": "gpt-4.1-mini",
      "prompt_ver": "v2.0",
      "summary": "LLM-generated summary for Cluster and Refinement nodes.",
      "parent_cluster_id": "c_<parent_cluster_id>",
      "parent_concept_id": "c_<parent_refinement_id>",
      "hierarchy_level": 2,
      "coherence": 0.95
    }
  ],
  "relations": [
    {
      "id": "r_<doc_id>_<index>",
      "src": "c_<concept_id>",
      "rel": "defines|depends_on|owns|leads|enables|...",
      "dst": "c_<concept_id>",
      "confidence": 0.0-1.0,
      "model_name": "gpt-4.1-mini"
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



## 3. Concept Types (Fixed Taxonomy v1.2)

This version introduces `Cluster` and `Refinement` as official concept types to support the semantic hierarchy.

| Type | Description | Examples |
|---|---|---|
| Person | Individual human | Brady Simmons, John Doe |
| Project | Named initiative | Loom Lite, Project Alpha |
| Date | Temporal reference | Q4 2024, January 2025 |
| Metric | Measurable value | Revenue Model, User Count |
| Technology | Technical system | OpenAI, PostgreSQL, React |
| Feature | Product capability | Semantic Search, Auto-tagging |
| Process | Workflow/procedure | Extraction Pipeline, Review Process |
| Topic | Subject matter | Healthcare, Finance, AI |
| Team | Organizational unit | Engineering Team, Sales Dept |
| **Cluster** | **A semantic grouping of concepts** | "Healthcare Delivery Models" |
| **Refinement** | **A sub-theme within a cluster** | "Membership-based Models" |

**Adding new types requires:**
1. Update this table
2. Update database schema enum
3. Update frontend color mapping
4. Update extraction prompt
5. Increment version to 1.3.0

---



## 4. Database Schema (Canonical v1.2)

This version adds the `summary` field to the `documents` and `concepts` tables, and formalizes the hierarchy fields.

### 4.1 Core Tables

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
    updated_at TEXT,
    summary TEXT -- New in v1.2
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
    summary TEXT, -- New in v1.2
    parent_cluster_id TEXT,
    parent_concept_id TEXT,
    hierarchy_level INTEGER,
    coherence REAL,
    FOREIGN KEY (doc_id) REFERENCES documents(id)
);

-- (Other tables remain unchanged)
```

### 4.2 Migration from v1.1 to v1.2

To upgrade an existing database from v1.1 to v1.2, the following SQL commands must be executed:

```sql
-- Add summary column to documents table
ALTER TABLE documents ADD COLUMN summary TEXT;

-- Add summary column to concepts table
ALTER TABLE concepts ADD COLUMN summary TEXT;
```

A backfill script will be needed to populate the `summary` fields for existing documents and clusters using the LLM.

---

## 5. Change Log (v1.1 → v1.2)

- **Schema:**
    - **Added:** `summary` field to `documents` table to store a top-level summary of the document.
    - **Added:** `summary` field to `concepts` table to store summaries for `Cluster` and `Refinement` nodes.
- **Concept Types:**
    - **Added:** `Cluster` and `Refinement` as official concept types, formalizing the semantic hierarchy.
- **Pipeline:**
    - The extraction pipeline must be updated to generate summaries for documents and hierarchical nodes.
    - The pipeline version will be incremented to `ingest+extract@v2.4.0`.

