"""
Sample ontology data for Loom Lite MVP
Demonstrates hierarchical concept structure with filtering capabilities
"""

import sqlite3
import json
from datetime import datetime
import hashlib

# Sample documents with rich content
SAMPLE_DOCUMENTS = [
    {
        "id": "doc_business_plan",
        "title": "Loom Lite Business Plan Q4 2024",
        "path": "/documents/business/loom_lite_business_plan.docx",
        "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content": """
Loom Lite Business Plan - Q4 2024

Executive Summary:
Loom Lite is a document-bound semantic relationship fabric system designed to enable concept-based navigation and search. Our revenue model relies on subscription pricing at $500 per month for enterprise memberships, targeting organizations with 50-500 employees.

Market Analysis:
The knowledge management market is projected to reach $1.2B by 2025. Our competitive advantage lies in the unique micro-ontology extraction capability that anchors concepts directly to verifiable text spans.

Financial Projections:
We project 100 customers by Q2 2025, generating $50,000 in monthly recurring revenue. Operating costs are estimated at $30,000 per month, including infrastructure, development, and support.

Product Roadmap:
Phase 1 (Q4 2024): MVP with basic extraction and visualization
Phase 2 (Q1 2025): N8N integration and API expansion
Phase 3 (Q2 2025): Multi-document weaving and governance layer

Team Structure:
Brady Simmons (Founder & CEO) leads product vision and strategy. Engineering team of 3 developers handles backend, frontend, and ML infrastructure. Customer success team of 2 manages onboarding and support.
"""
    },
    {
        "id": "doc_technical_spec",
        "title": "Loom Lite Technical Architecture",
        "path": "/documents/technical/architecture_v1.pdf",
        "mime": "application/pdf",
        "content": """
Loom Lite Technical Architecture Specification

System Overview:
Loom Lite uses a three-tier architecture: FastAPI backend, SQLite database with FAISS vector search, and vanilla JavaScript frontend with D3.js visualization.

Data Model:
Core entities include Document, Span, Concept, Relation, and Mention. Each concept has a type (Metric, Date, Person, Project, Topic) and confidence score. Relations use standard verbs like defines, depends_on, causes, and supports.

Extraction Pipeline:
Documents are ingested and segmented into spans. LLM-based extraction identifies concepts and relations. Vector embeddings enable semantic search. Results are stored with provenance metadata.

API Endpoints:
POST /api/ingest - Start document processing
GET /api/search - Semantic search with filters
GET /api/doc/{id}/ontology - Retrieve document ontology
POST /api/extract - Extract concepts from text

Security Considerations:
API authentication uses JWT tokens. Database access is restricted to backend services. User data is encrypted at rest. Rate limiting prevents abuse.

Performance Requirements:
Search queries must return results in <2 seconds. Extraction pipeline should process 10 pages per minute. Frontend should render ontologies with 100+ nodes smoothly.
"""
    },
    {
        "id": "doc_user_guide",
        "title": "Loom Lite User Guide",
        "path": "/documents/support/user_guide_v1.md",
        "mime": "text/markdown",
        "content": """
# Loom Lite User Guide

## Getting Started

Welcome to Loom Lite! This guide will help you navigate the semantic relationship fabric and extract insights from your documents.

## Interface Overview

The interface has three main panels:
- **Left Panel**: File tree showing your document hierarchy
- **Center Panel**: Mind map visualization of concepts and relationships
- **Right Panel**: Text viewer with highlighted evidence spans

## Searching Documents

Use the search bar at the top to find concepts and phrases. You can filter results by:
- Time periods (Q1 2024, January 2025, etc.)
- File types (PDF, DOCX, XLSX)
- Project tags (Loom Lite, Pillars, N8N)
- Concept types (Metric, Person, Date)

## Navigating Ontologies

Click on any document in the file tree to view its ontology. Concepts appear as nodes in the mind map. Click a concept to see where it appears in the document text.

Relationships between concepts are shown as connecting lines. Hover over a line to see the relationship type (defines, depends_on, etc.).

## Drilling Down

The system supports three levels of navigation:
1. **Corpus Level**: Search across all documents
2. **Document Level**: Explore concepts within a single document
3. **Span Level**: View exact text passages with highlighted evidence

## Tips and Best Practices

- Use specific search terms for better results
- Filter by time period to find recent information
- Click multiple concepts to see how they relate
- Use the confidence scores to assess extraction quality
"""
    }
]

# Rich ontology data with hierarchical concepts
SAMPLE_ONTOLOGY = {
    "doc_business_plan": {
        "concepts": [
            # Financial concepts
            {"id": "c_revenue_model", "label": "Revenue Model", "type": "Metric", "confidence": 0.92},
            {"id": "c_subscription_pricing", "label": "Subscription Pricing", "type": "Metric", "confidence": 0.89},
            {"id": "c_mrr", "label": "Monthly Recurring Revenue", "type": "Metric", "confidence": 0.87},
            {"id": "c_operating_costs", "label": "Operating Costs", "type": "Metric", "confidence": 0.85},
            
            # Temporal concepts
            {"id": "c_q4_2024", "label": "Q4 2024", "type": "Date", "confidence": 0.95},
            {"id": "c_q1_2025", "label": "Q1 2025", "type": "Date", "confidence": 0.94},
            {"id": "c_q2_2025", "label": "Q2 2025", "type": "Date", "confidence": 0.93},
            
            # Product concepts
            {"id": "c_loom_lite", "label": "Loom Lite", "type": "Project", "confidence": 0.98},
            {"id": "c_micro_ontology", "label": "Micro-Ontology Extraction", "type": "Feature", "confidence": 0.88},
            {"id": "c_n8n_integration", "label": "N8N Integration", "type": "Feature", "confidence": 0.86},
            
            # Market concepts
            {"id": "c_market_size", "label": "Knowledge Management Market", "type": "Topic", "confidence": 0.84},
            {"id": "c_competitive_advantage", "label": "Competitive Advantage", "type": "Topic", "confidence": 0.82},
            
            # People concepts
            {"id": "c_brady", "label": "Brady Simmons", "type": "Person", "confidence": 0.96},
            {"id": "c_eng_team", "label": "Engineering Team", "type": "Team", "confidence": 0.90},
        ],
        "relations": [
            {"src": "c_subscription_pricing", "rel": "defines", "dst": "c_revenue_model", "confidence": 0.88},
            {"src": "c_mrr", "rel": "measures", "dst": "c_revenue_model", "confidence": 0.85},
            {"src": "c_revenue_model", "rel": "depends_on", "dst": "c_subscription_pricing", "confidence": 0.87},
            {"src": "c_micro_ontology", "rel": "enables", "dst": "c_competitive_advantage", "confidence": 0.83},
            {"src": "c_loom_lite", "rel": "contains", "dst": "c_micro_ontology", "confidence": 0.90},
            {"src": "c_loom_lite", "rel": "contains", "dst": "c_n8n_integration", "confidence": 0.88},
            {"src": "c_q4_2024", "rel": "precedes", "dst": "c_q1_2025", "confidence": 0.95},
            {"src": "c_q1_2025", "rel": "precedes", "dst": "c_q2_2025", "confidence": 0.95},
            {"src": "c_brady", "rel": "owns", "dst": "c_loom_lite", "confidence": 0.92},
            {"src": "c_eng_team", "rel": "builds", "dst": "c_loom_lite", "confidence": 0.89},
        ],
        "mentions": {
            "c_revenue_model": [{"start": 185, "end": 198, "text": "revenue model"}],
            "c_subscription_pricing": [{"start": 209, "end": 229, "text": "subscription pricing"}],
            "c_loom_lite": [{"start": 0, "end": 10, "text": "Loom Lite"}, {"start": 50, "end": 60, "text": "Loom Lite"}],
            "c_q4_2024": [{"start": 27, "end": 35, "text": "Q4 2024"}],
            "c_brady": [{"start": 850, "end": 864, "text": "Brady Simmons"}],
        },
        "tags": [
            {"category": "time_period", "value": "Q4 2024", "confidence": 0.95},
            {"category": "project", "value": "Loom Lite", "confidence": 0.98},
            {"category": "file_type", "value": "Business Plan", "confidence": 0.92},
            {"category": "domain", "value": "Financial Planning", "confidence": 0.88},
        ]
    },
    "doc_technical_spec": {
        "concepts": [
            # Architecture concepts
            {"id": "c_fastapi", "label": "FastAPI", "type": "Technology", "confidence": 0.94},
            {"id": "c_sqlite", "label": "SQLite", "type": "Technology", "confidence": 0.93},
            {"id": "c_faiss", "label": "FAISS", "type": "Technology", "confidence": 0.91},
            {"id": "c_d3js", "label": "D3.js", "type": "Technology", "confidence": 0.90},
            
            # Data model concepts
            {"id": "c_document_entity", "label": "Document Entity", "type": "Concept", "confidence": 0.89},
            {"id": "c_span_entity", "label": "Span Entity", "type": "Concept", "confidence": 0.88},
            {"id": "c_concept_entity", "label": "Concept Entity", "type": "Concept", "confidence": 0.87},
            {"id": "c_relation_entity", "label": "Relation Entity", "type": "Concept", "confidence": 0.86},
            
            # Process concepts
            {"id": "c_extraction_pipeline", "label": "Extraction Pipeline", "type": "Process", "confidence": 0.92},
            {"id": "c_vector_embeddings", "label": "Vector Embeddings", "type": "Process", "confidence": 0.90},
            {"id": "c_semantic_search", "label": "Semantic Search", "type": "Feature", "confidence": 0.91},
            
            # Performance concepts
            {"id": "c_search_latency", "label": "Search Latency", "type": "Metric", "confidence": 0.87},
            {"id": "c_extraction_speed", "label": "Extraction Speed", "type": "Metric", "confidence": 0.85},
        ],
        "relations": [
            {"src": "c_fastapi", "rel": "part_of", "dst": "c_extraction_pipeline", "confidence": 0.88},
            {"src": "c_sqlite", "rel": "stores", "dst": "c_document_entity", "confidence": 0.90},
            {"src": "c_faiss", "rel": "enables", "dst": "c_semantic_search", "confidence": 0.89},
            {"src": "c_d3js", "rel": "renders", "dst": "c_concept_entity", "confidence": 0.86},
            {"src": "c_vector_embeddings", "rel": "enables", "dst": "c_semantic_search", "confidence": 0.91},
            {"src": "c_extraction_pipeline", "rel": "produces", "dst": "c_concept_entity", "confidence": 0.87},
            {"src": "c_search_latency", "rel": "measures", "dst": "c_semantic_search", "confidence": 0.84},
        ],
        "mentions": {
            "c_fastapi": [{"start": 120, "end": 127, "text": "FastAPI"}],
            "c_sqlite": [{"start": 137, "end": 143, "text": "SQLite"}],
            "c_faiss": [{"start": 158, "end": 163, "text": "FAISS"}],
            "c_semantic_search": [{"start": 180, "end": 195, "text": "semantic search"}],
        },
        "tags": [
            {"category": "file_type", "value": "Technical Specification", "confidence": 0.94},
            {"category": "domain", "value": "Software Architecture", "confidence": 0.92},
            {"category": "project", "value": "Loom Lite", "confidence": 0.96},
        ]
    },
    "doc_user_guide": {
        "concepts": [
            # Interface concepts
            {"id": "c_file_tree", "label": "File Tree", "type": "UI Component", "confidence": 0.91},
            {"id": "c_mind_map", "label": "Mind Map", "type": "UI Component", "confidence": 0.93},
            {"id": "c_text_viewer", "label": "Text Viewer", "type": "UI Component", "confidence": 0.90},
            
            # Feature concepts
            {"id": "c_search_filters", "label": "Search Filters", "type": "Feature", "confidence": 0.89},
            {"id": "c_concept_navigation", "label": "Concept Navigation", "type": "Feature", "confidence": 0.88},
            {"id": "c_hierarchical_view", "label": "Hierarchical View", "type": "Feature", "confidence": 0.87},
            
            # Level concepts
            {"id": "c_corpus_level", "label": "Corpus Level", "type": "Concept", "confidence": 0.86},
            {"id": "c_document_level", "label": "Document Level", "type": "Concept", "confidence": 0.85},
            {"id": "c_span_level", "label": "Span Level", "type": "Concept", "confidence": 0.84},
        ],
        "relations": [
            {"src": "c_file_tree", "rel": "part_of", "dst": "c_hierarchical_view", "confidence": 0.88},
            {"src": "c_mind_map", "rel": "visualizes", "dst": "c_concept_navigation", "confidence": 0.90},
            {"src": "c_search_filters", "rel": "enables", "dst": "c_concept_navigation", "confidence": 0.87},
            {"src": "c_corpus_level", "rel": "contains", "dst": "c_document_level", "confidence": 0.89},
            {"src": "c_document_level", "rel": "contains", "dst": "c_span_level", "confidence": 0.88},
        ],
        "mentions": {
            "c_file_tree": [{"start": 250, "end": 259, "text": "File tree"}],
            "c_mind_map": [{"start": 310, "end": 318, "text": "Mind map"}],
            "c_text_viewer": [{"start": 380, "end": 391, "text": "Text viewer"}],
        },
        "tags": [
            {"category": "file_type", "value": "User Guide", "confidence": 0.93},
            {"category": "domain", "value": "Documentation", "confidence": 0.91},
            {"category": "project", "value": "Loom Lite", "confidence": 0.95},
        ]
    }
}


def init_database(db_path: str = "loom_lite.db"):
    """Initialize database with schema and sample data"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Load and execute schema
    with open('schema.sql', 'r') as f:
        schema = f.read()
        cursor.executescript(schema)
    
    # Insert sample documents
    for doc in SAMPLE_DOCUMENTS:
        doc_id = doc["id"]
        checksum = hashlib.md5(doc["content"].encode()).hexdigest()
        
        cursor.execute("""
            INSERT OR REPLACE INTO Document (id, title, path, mime, checksum, file_size)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (doc_id, doc["title"], doc["path"], doc["mime"], checksum, len(doc["content"])))
        
        # Create spans (for simplicity, one span per document)
        span_id = f"span_{doc_id}"
        cursor.execute("""
            INSERT OR REPLACE INTO Span (id, doc_id, start_int, end_int, text)
            VALUES (?, ?, ?, ?, ?)
        """, (span_id, doc_id, 0, len(doc["content"]), doc["content"]))
        
        # Insert ontology data
        if doc_id in SAMPLE_ONTOLOGY:
            ontology = SAMPLE_ONTOLOGY[doc_id]
            
            # Insert concepts
            for concept in ontology["concepts"]:
                cursor.execute("""
                    INSERT OR REPLACE INTO Concept (id, label, type, confidence, origin)
                    VALUES (?, ?, ?, ?, ?)
                """, (concept["id"], concept["label"], concept["type"], 
                      concept["confidence"], "manual_sample"))
            
            # Insert relations
            for relation in ontology["relations"]:
                rel_id = f"rel_{relation['src']}_{relation['dst']}"
                cursor.execute("""
                    INSERT OR REPLACE INTO Relation (id, src_concept_id, rel, dst_concept_id, confidence, origin)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (rel_id, relation["src"], relation["rel"], relation["dst"],
                      relation["confidence"], "manual_sample"))
            
            # Insert mentions
            for concept_id, mentions in ontology["mentions"].items():
                for idx, mention in enumerate(mentions):
                    mention_id = f"mention_{concept_id}_{idx}"
                    # Create a span for this mention
                    mention_span_id = f"span_{doc_id}_{concept_id}_{idx}"
                    cursor.execute("""
                        INSERT OR REPLACE INTO Span (id, doc_id, start_int, end_int, text)
                        VALUES (?, ?, ?, ?, ?)
                    """, (mention_span_id, doc_id, mention["start"], mention["end"], 
                          mention.get("text", "")))
                    
                    cursor.execute("""
                        INSERT OR REPLACE INTO Mention (id, concept_id, doc_id, span_id)
                        VALUES (?, ?, ?, ?)
                    """, (mention_id, concept_id, doc_id, mention_span_id))
            
            # Insert tags
            for idx, tag in enumerate(ontology["tags"]):
                tag_id = f"tag_{doc_id}_{idx}"
                cursor.execute("""
                    INSERT OR REPLACE INTO Tag (id, doc_id, category, value, confidence)
                    VALUES (?, ?, ?, ?, ?)
                """, (tag_id, doc_id, tag["category"], tag["value"], tag["confidence"]))
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {db_path}")
    print(f"Inserted {len(SAMPLE_DOCUMENTS)} documents with rich ontology data")


if __name__ == "__main__":
    init_database()

