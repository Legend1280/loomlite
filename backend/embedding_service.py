"""
Embedding Service for LoomLite v5.1
Handles vector embeddings using sentence-transformers and ChromaDB
"""
import os
from typing import List, Dict, Optional, Tuple
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import numpy as np
import sqlite3
from datetime import datetime
from vector_utils import serialize_vector, generate_vector_fingerprint

# Model configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # 384 dimensions, fast, good quality
CHROMA_PATH = os.environ.get("CHROMA_PATH", "./chroma_db")

# Initialize model (lazy loading)
_model = None
_chroma_client = None

def get_embedding_model():
    """Get or initialize the embedding model (singleton pattern)"""
    global _model
    if _model is None:
        print(f"Loading embedding model: {EMBEDDING_MODEL}...")
        _model = SentenceTransformer(EMBEDDING_MODEL)
        print(f"Model loaded successfully. Embedding dimension: {_model.get_sentence_embedding_dimension()}")
    return _model

def get_chroma_client():
    """Get or initialize ChromaDB client (singleton pattern)"""
    global _chroma_client
    if _chroma_client is None:
        print(f"Initializing ChromaDB at: {CHROMA_PATH}")
        _chroma_client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        print("ChromaDB initialized successfully")
    return _chroma_client

def get_or_create_collection(name: str):
    """Get or create a ChromaDB collection"""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for a single text"""
    model = get_embedding_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()

def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for multiple texts (more efficient)"""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=True)
    return [emb.tolist() for emb in embeddings]

def add_document_embedding(doc_id: str, title: str, content: str, metadata: Optional[Dict] = None, db_path: str = "loom_lite.db"):
    """Add document embedding to both ChromaDB and SQLite"""
    collection = get_or_create_collection("documents")
    
    # Combine title and content for better semantic representation
    text = f"{title}\n\n{content}"
    embedding_list = generate_embedding(text)
    embedding_np = np.array(embedding_list, dtype=np.float32)
    
    # Generate fingerprint
    fingerprint = generate_vector_fingerprint(embedding_np, EMBEDDING_MODEL, len(embedding_np))
    
    # Store in SQLite
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            UPDATE Document 
            SET vector = ?,
                vector_fingerprint = ?,
                vector_model = ?,
                vector_dimension = ?,
                vector_generated_at = ?
            WHERE id = ?
        """, (
            serialize_vector(embedding_np),
            fingerprint,
            EMBEDDING_MODEL,
            len(embedding_np),
            datetime.utcnow().isoformat(),
            doc_id
        ))
        conn.commit()
        conn.close()
        print(f"✅ Stored vector for document {doc_id} in SQLite (fingerprint: {fingerprint})")
    except Exception as e:
        print(f"⚠️  Failed to store vector in SQLite: {e}")
    
    # Prepare metadata
    meta = metadata or {}
    meta.update({
        "doc_id": doc_id,
        "title": title,
        "type": "document",
        "fingerprint": fingerprint
    })
    
    # Add to ChromaDB collection
    collection.add(
        ids=[doc_id],
        embeddings=[embedding_list],
        documents=[text],
        metadatas=[meta]
    )
    
    return embedding_list

def add_concept_embedding(concept_id: str, label: str, doc_id: str, metadata: Optional[Dict] = None, db_path: str = "loom_lite.db"):
    """Add concept embedding to both ChromaDB and SQLite"""
    collection = get_or_create_collection("concepts")
    
    embedding_list = generate_embedding(label)
    embedding_np = np.array(embedding_list, dtype=np.float32)
    
    # Generate fingerprint
    fingerprint = generate_vector_fingerprint(embedding_np, EMBEDDING_MODEL, len(embedding_np))
    
    # Store in SQLite
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            UPDATE Concept 
            SET vector = ?,
                vector_fingerprint = ?,
                vector_model = ?,
                vector_dimension = ?,
                vector_generated_at = ?
            WHERE id = ?
        """, (
            serialize_vector(embedding_np),
            fingerprint,
            EMBEDDING_MODEL,
            len(embedding_np),
            datetime.utcnow().isoformat(),
            concept_id
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️  Failed to store concept vector in SQLite: {e}")
    
    # Prepare metadata
    meta = metadata or {}
    meta.update({
        "concept_id": concept_id,
        "doc_id": doc_id,
        "label": label,
        "type": "concept",
        "fingerprint": fingerprint
    })
    
    # Add to ChromaDB collection
    collection.add(
        ids=[concept_id],
        embeddings=[embedding_list],
        documents=[label],
        metadatas=[meta]
    )
    
    return embedding_list

def search_documents_semantic(query: str, n_results: int = 10) -> List[Dict]:
    """
    Semantic search across documents
    Returns: List of {doc_id, title, score, distance}
    """
    collection = get_or_create_collection("documents")
    
    # Generate query embedding
    query_embedding = generate_embedding(query)
    
    # Search
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["metadatas", "distances", "documents"]
    )
    
    # Format results
    formatted = []
    if results['ids'] and len(results['ids'][0]) > 0:
        for i, doc_id in enumerate(results['ids'][0]):
            metadata = results['metadatas'][0][i]
            distance = results['distances'][0][i]
            
            # Convert distance to similarity score (0-1, higher is better)
            # Cosine distance is 0-2, where 0 = identical
            similarity = 1 - (distance / 2)
            
            formatted.append({
                "doc_id": metadata.get("doc_id", doc_id),
                "title": metadata.get("title", "Unknown"),
                "score": round(similarity, 3),
                "distance": round(distance, 3),
                "type": "semantic"
            })
    
    return formatted

def search_concepts_semantic(query: str, n_results: int = 10) -> List[Dict]:
    """
    Semantic search across concepts
    Returns: List of {concept_id, label, doc_id, score, distance}
    """
    collection = get_or_create_collection("concepts")
    
    # Generate query embedding
    query_embedding = generate_embedding(query)
    
    # Search
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["metadatas", "distances", "documents"]
    )
    
    # Format results
    formatted = []
    if results['ids'] and len(results['ids'][0]) > 0:
        for i, concept_id in enumerate(results['ids'][0]):
            metadata = results['metadatas'][0][i]
            distance = results['distances'][0][i]
            
            # Convert distance to similarity score
            similarity = 1 - (distance / 2)
            
            formatted.append({
                "concept_id": metadata.get("concept_id", concept_id),
                "label": metadata.get("label", "Unknown"),
                "doc_id": metadata.get("doc_id", ""),
                "score": round(similarity, 3),
                "distance": round(distance, 3),
                "type": "semantic"
            })
    
    return formatted

def get_collection_stats() -> Dict:
    """Get statistics about ChromaDB collections"""
    try:
        client = get_chroma_client()
        
        docs_collection = get_or_create_collection("documents")
        concepts_collection = get_or_create_collection("concepts")
        
        return {
            "documents": docs_collection.count(),
            "concepts": concepts_collection.count(),
            "model": EMBEDDING_MODEL,
            "dimension": 384,
            "chroma_path": CHROMA_PATH
        }
    except Exception as e:
        return {
            "error": str(e),
            "documents": 0,
            "concepts": 0
        }

def delete_document_embedding(doc_id: str):
    """Delete document embedding from ChromaDB"""
    collection = get_or_create_collection("documents")
    try:
        collection.delete(ids=[doc_id])
        return True
    except:
        return False

def delete_concept_embedding(concept_id: str):
    """Delete concept embedding from ChromaDB"""
    collection = get_or_create_collection("concepts")
    try:
        collection.delete(ids=[concept_id])
        return True
    except:
        return False

if __name__ == "__main__":
    # Test the embedding service
    print("Testing Embedding Service...")
    
    # Test model loading
    model = get_embedding_model()
    print(f"✓ Model loaded: {EMBEDDING_MODEL}")
    
    # Test embedding generation
    test_text = "This is a test document about financial planning"
    embedding = generate_embedding(test_text)
    print(f"✓ Generated embedding: {len(embedding)} dimensions")
    
    # Test ChromaDB
    client = get_chroma_client()
    print(f"✓ ChromaDB initialized")
    
    # Get stats
    stats = get_collection_stats()
    print(f"✓ Collection stats: {stats}")
    
    print("\nEmbedding service is ready!")
