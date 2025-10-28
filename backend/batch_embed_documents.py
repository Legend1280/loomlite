"""
Batch Embedding Script for LoomLite v5.1
Generates embeddings for all existing documents and concepts in the database
"""
import sqlite3
import os
from backend.embedding_service import (
    add_document_embedding,
    add_concept_embedding,
    get_collection_stats
)

DB_PATH = os.environ.get("DB_PATH", "loom_lite.db")

def batch_embed_documents():
    """Generate embeddings for all documents in the database"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get all documents
    cur.execute("""
        SELECT id, title, path, created_at
        FROM Document
        ORDER BY created_at DESC
    """)
    
    documents = cur.fetchall()
    print(f"Found {len(documents)} documents to embed...")
    
    success_count = 0
    error_count = 0
    
    for doc in documents:
        doc_id, title, path, created_at = doc
        
        try:
            # Use title and path for content
            content = f"{title}\nPath: {path}"
            
            # Generate and store embedding
            add_document_embedding(
                doc_id=doc_id,
                title=title,
                content=content,
                metadata={
                    "created_at": created_at
                }
            )
            
            success_count += 1
            print(f"✓ Embedded document: {title[:50]}...")
            
        except Exception as e:
            error_count += 1
            print(f"✗ Error embedding {title[:50]}: {str(e)}")
    
    conn.close()
    
    print(f"\nDocument embedding complete:")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    
    return success_count, error_count

def batch_embed_concepts():
    """Generate embeddings for all concepts in the database"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get all concepts
    cur.execute("""
        SELECT c.id, c.label, c.type, m.doc_id
        FROM Concept c
        LEFT JOIN Mention m ON c.id = m.concept_id
        ORDER BY c.created_at DESC
    """)
    
    concepts = cur.fetchall()
    print(f"Found {len(concepts)} concepts to embed...")
    
    success_count = 0
    error_count = 0
    embedded_ids = set()
    
    for concept in concepts:
        concept_id, label, concept_type, doc_id = concept
        
        # Skip if already embedded (concepts can have multiple mentions)
        if concept_id in embedded_ids:
            continue
        
        try:
            # Generate and store embedding
            add_concept_embedding(
                concept_id=concept_id,
                label=label,
                doc_id=doc_id or "",
                metadata={
                    "type": concept_type
                }
            )
            
            embedded_ids.add(concept_id)
            success_count += 1
            
            if success_count % 50 == 0:
                print(f"  Embedded {success_count} concepts...")
            
        except Exception as e:
            error_count += 1
            print(f"✗ Error embedding concept {label}: {str(e)}")
    
    conn.close()
    
    print(f"\nConcept embedding complete:")
    print(f"  Success: {success_count}")
    print(f"  Errors: {error_count}")
    
    return success_count, error_count

if __name__ == "__main__":
    print("=" * 60)
    print("LoomLite Batch Embedding Script")
    print("=" * 60)
    print()
    
    # Show initial stats
    print("Initial ChromaDB stats:")
    stats = get_collection_stats()
    print(f"  Documents: {stats.get('documents', 0)}")
    print(f"  Concepts: {stats.get('concepts', 0)}")
    print()
    
    # Batch embed documents
    print("Step 1: Embedding documents...")
    print("-" * 60)
    doc_success, doc_errors = batch_embed_documents()
    print()
    
    # Batch embed concepts
    print("Step 2: Embedding concepts...")
    print("-" * 60)
    concept_success, concept_errors = batch_embed_concepts()
    print()
    
    # Show final stats
    print("=" * 60)
    print("Final ChromaDB stats:")
    stats = get_collection_stats()
    print(f"  Documents: {stats.get('documents', 0)}")
    print(f"  Concepts: {stats.get('concepts', 0)}")
    print(f"  Model: {stats.get('model', 'N/A')}")
    print(f"  Dimension: {stats.get('dimension', 'N/A')}")
    print()
    print("Batch embedding complete!")
    print("=" * 60)
