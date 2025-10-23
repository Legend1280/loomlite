"""
Generate rich sample micro-ontologies for Loom Lite MVP
Creates 3 documents with 20-30 concepts each
"""

import sqlite3
import json
from datetime import datetime

DB_PATH = "/home/ubuntu/loom-lite-mvp/backend/loom_lite_v2.db"

def init_db():
    """Initialize database with v2 schema"""
    conn = sqlite3.connect(DB_PATH)
    with open('/home/ubuntu/loom-lite-mvp/backend/schema_v2.sql', 'r') as f:
        conn.executescript(f.read())
    conn.commit()
    return conn

def create_sample_ontologies():
    """Create 3 rich micro-ontologies"""
    
    conn = init_db()
    cur = conn.cursor()
    
    # ========================================================================
    # Document 1: Business Plan (comprehensive)
    # ========================================================================
    
    doc1_id = "doc_business_plan"
    doc1 = {
        "id": doc1_id,
        "title": "Loom Lite Business Plan Q4 2024",
        "source_uri": "gdrive://folders/xyz/business_plan.docx",
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "checksum": "sha256:9f2e7a3b4c5d6e7f8g9h0i1j2k3l4m5n",
        "bytes": 451230,
        "created_at": "2024-11-11T18:20:00Z",
        "updated_at": "2025-10-22T09:00:00Z"
    }
    
    cur.execute("""
        INSERT INTO documents (id, title, source_uri, mime, checksum, bytes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc1["id"], doc1["title"], doc1["source_uri"], doc1["mime"], 
          doc1["checksum"], doc1["bytes"], doc1["created_at"], doc1["updated_at"]))
    
    # Ontology version
    cur.execute("""
        INSERT INTO ontology_versions (id, doc_id, model_name, model_version, pipeline, extracted_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("ver_bp_001", doc1_id, "gpt-4.1-mini", "2025-09-15", "ingest+extract@v0.2.1",
          "2025-10-22T09:15:05Z", "chunk=1500tok overlap=200"))
    
    # Spans (evidence)
    spans1 = [
        ("s_bp_001", doc1_id, 1200, 1291, "Our subscription pricing defines the revenue model for Q4 2024.", 6, "2. Pricing", "pdftext@1.3", 0.94),
        ("s_bp_002", doc1_id, 2400, 2512, "Brady Simmons owns the Loom Lite project and leads the development team.", 8, "3. Team", "pdftext@1.3", 0.96),
        ("s_bp_003", doc1_id, 3100, 3245, "The semantic search feature enables users to find concepts across all documents instantly.", 10, "4. Features", "pdftext@1.3", 0.92),
        ("s_bp_004", doc1_id, 4200, 4380, "N8N integration allows automated document ingestion and ontology extraction workflows.", 12, "5. Integration", "pdftext@1.3", 0.91),
        ("s_bp_005", doc1_id, 5100, 5220, "The micro-ontology architecture provides document-level concept graphs.", 14, "6. Architecture", "pdftext@1.3", 0.93),
        ("s_bp_006", doc1_id, 6000, 6150, "Target launch date is Q4 2024 with initial customer pilot in November 2024.", 16, "7. Timeline", "pdftext@1.3", 0.95),
        ("s_bp_007", doc1_id, 7200, 7340, "The ontology visualization uses D3.js force-directed graphs for interactive exploration.", 18, "8. Technology", "pdftext@1.3", 0.90),
        ("s_bp_008", doc1_id, 8100, 8250, "Character-level provenance tracking ensures every concept links back to source text.", 20, "9. Provenance", "pdftext@1.3", 0.94),
        ("s_bp_009", doc1_id, 9000, 9180, "The knowledge graph supports cross-document concept discovery and relationship mapping.", 22, "10. Knowledge Graph", "pdftext@1.3", 0.92),
        ("s_bp_010", doc1_id, 10100, 10240, "FastAPI backend provides REST endpoints for ontology queries and document navigation.", 24, "11. Backend", "pdftext@1.3", 0.91),
    ]
    
    cur.executemany("""
        INSERT INTO spans (id, doc_id, start, "end", text, page_hint, section, extractor, quality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, spans1)
    
    # Concepts (20 concepts for rich visualization)
    concepts1 = [
        ("c_bp_sub_pricing", doc1_id, "Subscription Pricing", "Metric", 0.86, '["Pricing Model","Monthly Fee"]', '["Finance","Pricing"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_revenue_model", doc1_id, "Revenue Model", "Metric", 0.82, '["Business Model","Income Strategy"]', '["Finance","Strategy"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_q4_2024", doc1_id, "Q4 2024", "Date", 0.91, '["Fourth Quarter 2024","Q4"]', '["Timeline","Milestone"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_brady", doc1_id, "Brady Simmons", "Person", 0.95, '["Brady","B. Simmons"]', '["Team","Leadership"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_loom_lite", doc1_id, "Loom Lite", "Project", 0.93, '["Loom","Loom System"]', '["Product","Software"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_dev_team", doc1_id, "Development Team", "Team", 0.88, '["Dev Team","Engineering"]', '["Team","Organization"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_semantic_search", doc1_id, "Semantic Search", "Feature", 0.90, '["Search","Concept Search"]', '["Feature","Technology"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_n8n", doc1_id, "N8N Integration", "Technology", 0.87, '["N8N","Workflow Automation"]', '["Integration","Automation"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_micro_ontology", doc1_id, "Micro-Ontology", "Topic", 0.89, '["Document Ontology","Local Graph"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_launch_date", doc1_id, "Launch Date", "Date", 0.92, '["Release Date","Go-Live"]', '["Timeline","Milestone"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_nov_2024", doc1_id, "November 2024", "Date", 0.90, '["Nov 2024","2024-11"]', '["Timeline","Milestone"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_pilot", doc1_id, "Customer Pilot", "Process", 0.85, '["Pilot Program","Beta Test"]', '["Process","Testing"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_d3js", doc1_id, "D3.js", "Technology", 0.94, '["D3","Data-Driven Documents"]', '["Technology","Visualization"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_force_graph", doc1_id, "Force-Directed Graph", "Feature", 0.88, '["Force Layout","Graph Visualization"]', '["Feature","Visualization"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_provenance", doc1_id, "Character-Level Provenance", "Feature", 0.91, '["Provenance","Source Tracking"]', '["Feature","Architecture"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_knowledge_graph", doc1_id, "Knowledge Graph", "Topic", 0.87, '["KG","Concept Graph"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_cross_doc", doc1_id, "Cross-Document Discovery", "Feature", 0.84, '["Multi-Doc Search","Document Linking"]', '["Feature","Search"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_fastapi", doc1_id, "FastAPI", "Technology", 0.93, '["Fast API","Python API"]', '["Technology","Backend"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_rest_api", doc1_id, "REST API", "Technology", 0.89, '["RESTful API","HTTP API"]', '["Technology","Interface"]', "gpt-4.1-mini", "p2.1"),
        ("c_bp_doc_nav", doc1_id, "Document Navigation", "Feature", 0.86, '["Nav","Document Browsing"]', '["Feature","UI"]', "gpt-4.1-mini", "p2.1"),
    ]
    
    cur.executemany("""
        INSERT INTO concepts (id, doc_id, label, type, confidence, aliases, tags, model_name, prompt_ver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, concepts1)
    
    # Relations (15 meaningful relationships)
    relations1 = [
        ("r_bp_001", doc1_id, "c_bp_sub_pricing", "defines", "c_bp_revenue_model", 0.78, "gpt-4.1-mini", None),
        ("r_bp_002", doc1_id, "c_bp_q4_2024", "occurs_on", "c_bp_revenue_model", 0.74, "gpt-4.1-mini", None),
        ("r_bp_003", doc1_id, "c_bp_brady", "owns", "c_bp_loom_lite", 0.92, "gpt-4.1-mini", None),
        ("r_bp_004", doc1_id, "c_bp_brady", "leads", "c_bp_dev_team", 0.88, "gpt-4.1-mini", None),
        ("r_bp_005", doc1_id, "c_bp_semantic_search", "enables", "c_bp_cross_doc", 0.85, "gpt-4.1-mini", None),
        ("r_bp_006", doc1_id, "c_bp_n8n", "supports", "c_bp_loom_lite", 0.80, "gpt-4.1-mini", None),
        ("r_bp_007", doc1_id, "c_bp_micro_ontology", "contains", "c_bp_knowledge_graph", 0.83, "gpt-4.1-mini", None),
        ("r_bp_008", doc1_id, "c_bp_launch_date", "precedes", "c_bp_pilot", 0.79, "gpt-4.1-mini", None),
        ("r_bp_009", doc1_id, "c_bp_nov_2024", "occurs_on", "c_bp_pilot", 0.86, "gpt-4.1-mini", None),
        ("r_bp_010", doc1_id, "c_bp_d3js", "enables", "c_bp_force_graph", 0.91, "gpt-4.1-mini", None),
        ("r_bp_011", doc1_id, "c_bp_provenance", "supports", "c_bp_semantic_search", 0.77, "gpt-4.1-mini", None),
        ("r_bp_012", doc1_id, "c_bp_fastapi", "provides", "c_bp_rest_api", 0.89, "gpt-4.1-mini", None),
        ("r_bp_013", doc1_id, "c_bp_rest_api", "enables", "c_bp_doc_nav", 0.82, "gpt-4.1-mini", None),
        ("r_bp_014", doc1_id, "c_bp_loom_lite", "uses", "c_bp_micro_ontology", 0.87, "gpt-4.1-mini", None),
        ("r_bp_015", doc1_id, "c_bp_dev_team", "develops", "c_bp_loom_lite", 0.90, "gpt-4.1-mini", None),
    ]
    
    cur.executemany("""
        INSERT INTO relations (id, doc_id, src, rel, dst, confidence, model_name, rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, relations1)
    
    # Mentions (link concepts to spans)
    mentions1 = [
        ("m_bp_001", "c_bp_sub_pricing", doc1_id, "s_bp_001", 0.85),
        ("m_bp_002", "c_bp_revenue_model", doc1_id, "s_bp_001", 0.77),
        ("m_bp_003", "c_bp_q4_2024", doc1_id, "s_bp_001", 0.80),
        ("m_bp_004", "c_bp_brady", doc1_id, "s_bp_002", 0.92),
        ("m_bp_005", "c_bp_loom_lite", doc1_id, "s_bp_002", 0.88),
        ("m_bp_006", "c_bp_dev_team", doc1_id, "s_bp_002", 0.84),
        ("m_bp_007", "c_bp_semantic_search", doc1_id, "s_bp_003", 0.90),
        ("m_bp_008", "c_bp_n8n", doc1_id, "s_bp_004", 0.87),
        ("m_bp_009", "c_bp_micro_ontology", doc1_id, "s_bp_005", 0.89),
        ("m_bp_010", "c_bp_q4_2024", doc1_id, "s_bp_006", 0.85),
        ("m_bp_011", "c_bp_nov_2024", doc1_id, "s_bp_006", 0.88),
        ("m_bp_012", "c_bp_pilot", doc1_id, "s_bp_006", 0.82),
        ("m_bp_013", "c_bp_d3js", doc1_id, "s_bp_007", 0.94),
        ("m_bp_014", "c_bp_force_graph", doc1_id, "s_bp_007", 0.86),
        ("m_bp_015", "c_bp_provenance", doc1_id, "s_bp_008", 0.91),
        ("m_bp_016", "c_bp_knowledge_graph", doc1_id, "s_bp_009", 0.87),
        ("m_bp_017", "c_bp_cross_doc", doc1_id, "s_bp_009", 0.83),
        ("m_bp_018", "c_bp_fastapi", doc1_id, "s_bp_010", 0.93),
        ("m_bp_019", "c_bp_rest_api", doc1_id, "s_bp_010", 0.89),
        ("m_bp_020", "c_bp_doc_nav", doc1_id, "s_bp_010", 0.86),
    ]
    
    cur.executemany("""
        INSERT INTO mentions (id, concept_id, doc_id, span_id, confidence)
        VALUES (?, ?, ?, ?, ?)
    """, mentions1)
    
    # ========================================================================
    # Document 2: Technical Specification (architecture-focused)
    # ========================================================================
    
    doc2_id = "doc_technical_spec"
    doc2 = {
        "id": doc2_id,
        "title": "Loom Lite Technical Architecture Specification",
        "source_uri": "gdrive://folders/xyz/tech_spec.pdf",
        "mime": "application/pdf",
        "checksum": "sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
        "bytes": 782450,
        "created_at": "2024-10-15T10:30:00Z",
        "updated_at": "2025-10-20T14:45:00Z"
    }
    
    cur.execute("""
        INSERT INTO documents (id, title, source_uri, mime, checksum, bytes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc2["id"], doc2["title"], doc2["source_uri"], doc2["mime"],
          doc2["checksum"], doc2["bytes"], doc2["created_at"], doc2["updated_at"]))
    
    cur.execute("""
        INSERT INTO ontology_versions (id, doc_id, model_name, model_version, pipeline, extracted_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("ver_ts_001", doc2_id, "gpt-4.1-mini", "2025-09-15", "ingest+extract@v0.2.1",
          "2025-10-20T15:00:00Z", "chunk=1800tok overlap=250"))
    
    # Spans for technical spec
    spans2 = [
        ("s_ts_001", doc2_id, 500, 650, "The system uses SQLite for local ontology storage with FTS5 for full-text search.", 3, "1. Database", "pdftext@1.3", 0.95),
        ("s_ts_002", doc2_id, 1200, 1380, "Pydantic models ensure type-safe data validation for all ontology objects.", 5, "2. Data Models", "pdftext@1.3", 0.93),
        ("s_ts_003", doc2_id, 2100, 2280, "The MicroOntology object encapsulates document metadata, spans, concepts, and relations.", 7, "3. Core Objects", "pdftext@1.3", 0.94),
        ("s_ts_004", doc2_id, 3000, 3190, "Vector embeddings enable semantic similarity search across concepts and spans.", 9, "4. Embeddings", "pdftext@1.3", 0.91),
        ("s_ts_005", doc2_id, 4100, 4280, "The extraction pipeline uses GPT-4.1-mini for concept and relation extraction.", 11, "5. LLM Pipeline", "pdftext@1.3", 0.92),
    ]
    
    cur.executemany("""
        INSERT INTO spans (id, doc_id, start, "end", text, page_hint, section, extractor, quality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, spans2)
    
    # Concepts for technical spec (15 concepts)
    concepts2 = [
        ("c_ts_sqlite", doc2_id, "SQLite", "Technology", 0.95, '["SQLite3","SQL Database"]', '["Database","Storage"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_fts5", doc2_id, "FTS5", "Technology", 0.90, '["Full-Text Search","SQLite FTS"]', '["Search","Technology"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_pydantic", doc2_id, "Pydantic", "Technology", 0.93, '["Pydantic Models","Data Validation"]', '["Technology","Framework"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_micro_ont", doc2_id, "MicroOntology Object", "Topic", 0.94, '["Micro-Ontology","Ontology Model"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_vectors", doc2_id, "Vector Embeddings", "Technology", 0.91, '["Embeddings","Semantic Vectors"]', '["Technology","AI"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_semantic_sim", doc2_id, "Semantic Similarity", "Feature", 0.89, '["Similarity Search","Vector Search"]', '["Feature","Search"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_gpt4", doc2_id, "GPT-4.1-mini", "Technology", 0.92, '["GPT-4","OpenAI Model"]', '["Technology","LLM"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_extraction", doc2_id, "Extraction Pipeline", "Process", 0.88, '["Pipeline","Data Extraction"]', '["Process","Architecture"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_type_safety", doc2_id, "Type-Safe Validation", "Feature", 0.87, '["Type Safety","Data Validation"]', '["Feature","Quality"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_metadata", doc2_id, "Document Metadata", "Topic", 0.85, '["Metadata","Doc Info"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_spans", doc2_id, "Span Anchors", "Topic", 0.90, '["Spans","Evidence Anchors"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_concepts", doc2_id, "Concept Nodes", "Topic", 0.91, '["Concepts","Ontology Nodes"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_relations", doc2_id, "Relation Edges", "Topic", 0.89, '["Relations","Ontology Edges"]', '["Architecture","Concept"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_local_storage", doc2_id, "Local Storage", "Feature", 0.86, '["Local DB","Offline Storage"]', '["Feature","Architecture"]', "gpt-4.1-mini", "p2.1"),
        ("c_ts_full_text", doc2_id, "Full-Text Search", "Feature", 0.92, '["FTS","Text Search"]', '["Feature","Search"]', "gpt-4.1-mini", "p2.1"),
    ]
    
    cur.executemany("""
        INSERT INTO concepts (id, doc_id, label, type, confidence, aliases, tags, model_name, prompt_ver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, concepts2)
    
    # Relations for technical spec
    relations2 = [
        ("r_ts_001", doc2_id, "c_ts_sqlite", "provides", "c_ts_local_storage", 0.88, "gpt-4.1-mini", None),
        ("r_ts_002", doc2_id, "c_ts_fts5", "enables", "c_ts_full_text", 0.91, "gpt-4.1-mini", None),
        ("r_ts_003", doc2_id, "c_ts_pydantic", "ensures", "c_ts_type_safety", 0.89, "gpt-4.1-mini", None),
        ("r_ts_004", doc2_id, "c_ts_micro_ont", "contains", "c_ts_metadata", 0.85, "gpt-4.1-mini", None),
        ("r_ts_005", doc2_id, "c_ts_micro_ont", "contains", "c_ts_spans", 0.87, "gpt-4.1-mini", None),
        ("r_ts_006", doc2_id, "c_ts_micro_ont", "contains", "c_ts_concepts", 0.88, "gpt-4.1-mini", None),
        ("r_ts_007", doc2_id, "c_ts_micro_ont", "contains", "c_ts_relations", 0.86, "gpt-4.1-mini", None),
        ("r_ts_008", doc2_id, "c_ts_vectors", "enables", "c_ts_semantic_sim", 0.92, "gpt-4.1-mini", None),
        ("r_ts_009", doc2_id, "c_ts_gpt4", "powers", "c_ts_extraction", 0.90, "gpt-4.1-mini", None),
        ("r_ts_010", doc2_id, "c_ts_extraction", "produces", "c_ts_micro_ont", 0.84, "gpt-4.1-mini", None),
    ]
    
    cur.executemany("""
        INSERT INTO relations (id, doc_id, src, rel, dst, confidence, model_name, rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, relations2)
    
    # Mentions for technical spec
    mentions2 = [
        ("m_ts_001", "c_ts_sqlite", doc2_id, "s_ts_001", 0.95),
        ("m_ts_002", "c_ts_fts5", doc2_id, "s_ts_001", 0.90),
        ("m_ts_003", "c_ts_full_text", doc2_id, "s_ts_001", 0.87),
        ("m_ts_004", "c_ts_pydantic", doc2_id, "s_ts_002", 0.93),
        ("m_ts_005", "c_ts_type_safety", doc2_id, "s_ts_002", 0.88),
        ("m_ts_006", "c_ts_micro_ont", doc2_id, "s_ts_003", 0.94),
        ("m_ts_007", "c_ts_metadata", doc2_id, "s_ts_003", 0.82),
        ("m_ts_008", "c_ts_spans", doc2_id, "s_ts_003", 0.85),
        ("m_ts_009", "c_ts_concepts", doc2_id, "s_ts_003", 0.86),
        ("m_ts_010", "c_ts_relations", doc2_id, "s_ts_003", 0.84),
        ("m_ts_011", "c_ts_vectors", doc2_id, "s_ts_004", 0.91),
        ("m_ts_012", "c_ts_semantic_sim", doc2_id, "s_ts_004", 0.89),
        ("m_ts_013", "c_ts_gpt4", doc2_id, "s_ts_005", 0.92),
        ("m_ts_014", "c_ts_extraction", doc2_id, "s_ts_005", 0.88),
    ]
    
    cur.executemany("""
        INSERT INTO mentions (id, concept_id, doc_id, span_id, confidence)
        VALUES (?, ?, ?, ?, ?)
    """, mentions2)
    
    # ========================================================================
    # Document 3: User Guide (feature-focused)
    # ========================================================================
    
    doc3_id = "doc_user_guide"
    doc3 = {
        "id": doc3_id,
        "title": "Loom Lite User Guide",
        "source_uri": "file:///docs/user_guide.md",
        "mime": "text/markdown",
        "checksum": "sha256:x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4",
        "bytes": 124567,
        "created_at": "2024-09-20T08:00:00Z",
        "updated_at": "2025-10-18T16:30:00Z"
    }
    
    cur.execute("""
        INSERT INTO documents (id, title, source_uri, mime, checksum, bytes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc3["id"], doc3["title"], doc3["source_uri"], doc3["mime"],
          doc3["checksum"], doc3["bytes"], doc3["created_at"], doc3["updated_at"]))
    
    cur.execute("""
        INSERT INTO ontology_versions (id, doc_id, model_name, model_version, pipeline, extracted_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("ver_ug_001", doc3_id, "gpt-4.1-mini", "2025-09-15", "ingest+extract@v0.2.1",
          "2025-10-18T17:00:00Z", "chunk=1200tok overlap=150"))
    
    # Spans for user guide
    spans3 = [
        ("s_ug_001", doc3_id, 300, 450, "Use the search bar to find concepts across all your documents instantly.", 2, "Getting Started", "markdown@1.0", 0.96),
        ("s_ug_002", doc3_id, 800, 980, "Click on any concept node to view the evidence text in the right panel.", 4, "Navigation", "markdown@1.0", 0.94),
        ("s_ug_003", doc3_id, 1400, 1580, "Filter by concept type using the chips at the top of the screen.", 6, "Filtering", "markdown@1.0", 0.92),
        ("s_ug_004", doc3_id, 2000, 2190, "The mind map visualization shows relationships between concepts in your documents.", 8, "Visualization", "markdown@1.0", 0.93),
        ("s_ug_005", doc3_id, 2600, 2780, "Upload documents through the N8N workflow for automatic ontology extraction.", 10, "Document Upload", "markdown@1.0", 0.91),
    ]
    
    cur.executemany("""
        INSERT INTO spans (id, doc_id, start, "end", text, page_hint, section, extractor, quality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, spans3)
    
    # Concepts for user guide (12 concepts)
    concepts3 = [
        ("c_ug_search_bar", doc3_id, "Search Bar", "Feature", 0.96, '["Search","Query Input"]', '["UI","Feature"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_concept_node", doc3_id, "Concept Node", "Feature", 0.94, '["Node","Graph Node"]', '["UI","Visualization"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_evidence_panel", doc3_id, "Evidence Panel", "Feature", 0.92, '["Right Panel","Text Viewer"]', '["UI","Feature"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_filter_chips", doc3_id, "Filter Chips", "Feature", 0.92, '["Filters","Type Filters"]', '["UI","Feature"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_mind_map", doc3_id, "Mind Map", "Feature", 0.93, '["Graph View","Ontology Visualization"]', '["UI","Visualization"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_relationships", doc3_id, "Concept Relationships", "Topic", 0.89, '["Relations","Connections"]', '["Concept","Architecture"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_upload", doc3_id, "Document Upload", "Process", 0.91, '["Upload","File Ingestion"]', '["Process","Feature"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_n8n_workflow", doc3_id, "N8N Workflow", "Process", 0.87, '["Workflow","Automation"]', '["Process","Integration"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_auto_extract", doc3_id, "Automatic Extraction", "Feature", 0.88, '["Auto Extract","LLM Extraction"]', '["Feature","Process"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_navigation", doc3_id, "Document Navigation", "Feature", 0.90, '["Nav","Browsing"]', '["Feature","UI"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_click_action", doc3_id, "Click to View", "Feature", 0.85, '["Click","Interaction"]', '["UI","Feature"]', "gpt-4.1-mini", "p2.1"),
        ("c_ug_instant_search", doc3_id, "Instant Search", "Feature", 0.94, '["Fast Search","Real-time Search"]', '["Feature","Performance"]', "gpt-4.1-mini", "p2.1"),
    ]
    
    cur.executemany("""
        INSERT INTO concepts (id, doc_id, label, type, confidence, aliases, tags, model_name, prompt_ver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, concepts3)
    
    # Relations for user guide
    relations3 = [
        ("r_ug_001", doc3_id, "c_ug_search_bar", "enables", "c_ug_instant_search", 0.92, "gpt-4.1-mini", None),
        ("r_ug_002", doc3_id, "c_ug_concept_node", "triggers", "c_ug_click_action", 0.88, "gpt-4.1-mini", None),
        ("r_ug_003", doc3_id, "c_ug_click_action", "displays", "c_ug_evidence_panel", 0.90, "gpt-4.1-mini", None),
        ("r_ug_004", doc3_id, "c_ug_filter_chips", "controls", "c_ug_mind_map", 0.85, "gpt-4.1-mini", None),
        ("r_ug_005", doc3_id, "c_ug_mind_map", "shows", "c_ug_relationships", 0.89, "gpt-4.1-mini", None),
        ("r_ug_006", doc3_id, "c_ug_upload", "uses", "c_ug_n8n_workflow", 0.87, "gpt-4.1-mini", None),
        ("r_ug_007", doc3_id, "c_ug_n8n_workflow", "performs", "c_ug_auto_extract", 0.91, "gpt-4.1-mini", None),
        ("r_ug_008", doc3_id, "c_ug_concept_node", "supports", "c_ug_navigation", 0.84, "gpt-4.1-mini", None),
    ]
    
    cur.executemany("""
        INSERT INTO relations (id, doc_id, src, rel, dst, confidence, model_name, rule)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, relations3)
    
    # Mentions for user guide
    mentions3 = [
        ("m_ug_001", "c_ug_search_bar", doc3_id, "s_ug_001", 0.96),
        ("m_ug_002", "c_ug_instant_search", doc3_id, "s_ug_001", 0.92),
        ("m_ug_003", "c_ug_concept_node", doc3_id, "s_ug_002", 0.94),
        ("m_ug_004", "c_ug_evidence_panel", doc3_id, "s_ug_002", 0.90),
        ("m_ug_005", "c_ug_click_action", doc3_id, "s_ug_002", 0.87),
        ("m_ug_006", "c_ug_filter_chips", doc3_id, "s_ug_003", 0.92),
        ("m_ug_007", "c_ug_mind_map", doc3_id, "s_ug_004", 0.93),
        ("m_ug_008", "c_ug_relationships", doc3_id, "s_ug_004", 0.89),
        ("m_ug_009", "c_ug_upload", doc3_id, "s_ug_005", 0.91),
        ("m_ug_010", "c_ug_n8n_workflow", doc3_id, "s_ug_005", 0.87),
        ("m_ug_011", "c_ug_auto_extract", doc3_id, "s_ug_005", 0.88),
    ]
    
    cur.executemany("""
        INSERT INTO mentions (id, concept_id, doc_id, span_id, confidence)
        VALUES (?, ?, ?, ?, ?)
    """, mentions3)
    
    conn.commit()
    conn.close()
    
    print("✅ Sample data v2 created successfully!")
    print(f"   - 3 documents")
    print(f"   - 47 concepts (20 + 15 + 12)")
    print(f"   - 33 relations (15 + 10 + 8)")
    print(f"   - 25 spans (10 + 5 + 5 + 5)")
    print(f"   - 45 mentions")
    print(f"   Database: {DB_PATH}")

if __name__ == "__main__":
    create_sample_ontologies()

