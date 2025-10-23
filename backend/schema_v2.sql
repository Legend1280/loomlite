-- Loom Lite Ontology-First Schema v2
-- Based on MicroOntology object model specification

-- Documents (metadata + provenance)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source_uri TEXT,
  mime TEXT,
  checksum TEXT UNIQUE,
  bytes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_checksum ON documents(checksum);

-- Ontology Versions (extraction pipeline tracking)
CREATE TABLE IF NOT EXISTS ontology_versions (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_version TEXT,
  pipeline TEXT,
  extracted_at TEXT NOT NULL,
  notes TEXT,
  superseded BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ontology_versions_doc ON ontology_versions(doc_id);

-- Spans (evidence anchors with character offsets)
CREATE TABLE IF NOT EXISTS spans (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  start INTEGER NOT NULL,
  "end" INTEGER NOT NULL,
  text TEXT NOT NULL,
  page_hint INTEGER,
  section TEXT,
  extractor TEXT,
  quality REAL
);

CREATE INDEX IF NOT EXISTS idx_spans_doc ON spans(doc_id);
CREATE INDEX IF NOT EXISTS idx_spans_range ON spans(doc_id, start, "end");

-- Full-text search on spans
CREATE VIRTUAL TABLE IF NOT EXISTS spans_fts USING fts5(
  span_id UNINDEXED,
  text,
  content='spans',
  tokenize='porter'
);

-- Concepts (typed nodes with confidence)
CREATE TABLE IF NOT EXISTS concepts (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  aliases TEXT,  -- JSON array
  tags TEXT,     -- JSON array
  model_name TEXT,
  prompt_ver TEXT
);

CREATE INDEX IF NOT EXISTS idx_concepts_doc ON concepts(doc_id);
CREATE INDEX IF NOT EXISTS idx_concepts_label ON concepts(label);
CREATE INDEX IF NOT EXISTS idx_concepts_type ON concepts(type);
CREATE INDEX IF NOT EXISTS idx_concepts_doc_type ON concepts(doc_id, type);

-- Relations (directed edges with confidence)
CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  src TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  rel TEXT NOT NULL,
  dst TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  confidence REAL DEFAULT 1.0,
  model_name TEXT,
  rule TEXT
);

CREATE INDEX IF NOT EXISTS idx_relations_doc ON relations(doc_id);
CREATE INDEX IF NOT EXISTS idx_relations_src ON relations(src);
CREATE INDEX IF NOT EXISTS idx_relations_dst ON relations(dst);
CREATE INDEX IF NOT EXISTS idx_relations_rel ON relations(rel);

-- Mentions (concept → span links)
CREATE TABLE IF NOT EXISTS mentions (
  id TEXT PRIMARY KEY,
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  doc_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  span_id TEXT NOT NULL REFERENCES spans(id) ON DELETE CASCADE,
  confidence REAL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_mentions_concept ON mentions(concept_id);
CREATE INDEX IF NOT EXISTS idx_mentions_span ON mentions(span_id);
CREATE INDEX IF NOT EXISTS idx_mentions_doc ON mentions(doc_id);

-- Tags (for filtering)
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  category TEXT,
  count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);

-- Concept-Tag associations
CREATE TABLE IF NOT EXISTS concept_tags (
  concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (concept_id, tag_id)
);

-- Vector embeddings (optional, for semantic search)
CREATE TABLE IF NOT EXISTS concept_vectors (
  concept_id TEXT PRIMARY KEY REFERENCES concepts(id) ON DELETE CASCADE,
  embedding BLOB  -- Store as binary array
);

CREATE TABLE IF NOT EXISTS span_vectors (
  span_id TEXT PRIMARY KEY REFERENCES spans(id) ON DELETE CASCADE,
  embedding BLOB
);

