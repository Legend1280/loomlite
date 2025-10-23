-- Loom Lite MVP - Enhanced Database Schema
-- Supports hierarchical ontology with concept filtering

-- Documents with enhanced metadata
CREATE TABLE IF NOT EXISTS Document (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT,
    checksum TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_document_mime ON Document(mime);
CREATE INDEX idx_document_created ON Document(created_at);

-- Text spans with character offsets
CREATE TABLE IF NOT EXISTS Span (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    start_int INTEGER NOT NULL,
    end_int INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (doc_id) REFERENCES Document(id) ON DELETE CASCADE
);

CREATE INDEX idx_span_doc ON Span(doc_id);

-- Concepts with enhanced typing
CREATE TABLE IF NOT EXISTS Concept (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL,  -- Metric, Date, Person, Project, Topic, etc.
    confidence REAL DEFAULT 1.0,
    origin TEXT,  -- LLM model/version used for extraction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_concept_type ON Concept(type);
CREATE INDEX idx_concept_label ON Concept(label);

-- Relations between concepts
CREATE TABLE IF NOT EXISTS Relation (
    id TEXT PRIMARY KEY,
    src_concept_id TEXT NOT NULL,
    rel TEXT NOT NULL,  -- defines, depends_on, causes, etc.
    dst_concept_id TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    origin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (src_concept_id) REFERENCES Concept(id) ON DELETE CASCADE,
    FOREIGN KEY (dst_concept_id) REFERENCES Concept(id) ON DELETE CASCADE
);

CREATE INDEX idx_relation_src ON Relation(src_concept_id);
CREATE INDEX idx_relation_dst ON Relation(dst_concept_id);
CREATE INDEX idx_relation_type ON Relation(rel);

-- Mentions linking concepts to document spans
CREATE TABLE IF NOT EXISTS Mention (
    id TEXT PRIMARY KEY,
    concept_id TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    FOREIGN KEY (concept_id) REFERENCES Concept(id) ON DELETE CASCADE,
    FOREIGN KEY (doc_id) REFERENCES Document(id) ON DELETE CASCADE,
    FOREIGN KEY (span_id) REFERENCES Span(id) ON DELETE CASCADE
);

CREATE INDEX idx_mention_concept ON Mention(concept_id);
CREATE INDEX idx_mention_doc ON Mention(doc_id);

-- Metadata tags for filtering
CREATE TABLE IF NOT EXISTS Tag (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL,
    category TEXT NOT NULL,  -- time_period, file_type, project, domain
    value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    FOREIGN KEY (doc_id) REFERENCES Document(id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_doc ON Tag(doc_id);
CREATE INDEX idx_tag_category ON Tag(category);
CREATE INDEX idx_tag_value ON Tag(value);

-- Full-text search virtual table for documents
CREATE VIRTUAL TABLE IF NOT EXISTS DocumentFTS USING fts5(
    doc_id UNINDEXED,
    title,
    content,
    content=Document,
    content_rowid=rowid
);

-- Full-text search virtual table for concepts
CREATE VIRTUAL TABLE IF NOT EXISTS ConceptFTS USING fts5(
    concept_id UNINDEXED,
    label,
    content=Concept,
    content_rowid=rowid
);

