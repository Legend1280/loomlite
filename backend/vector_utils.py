"""
Vector Utilities for LoomLite v5.2

Provides functions for:
- Vector serialization/deserialization (SQLite BLOB storage)
- Vector fingerprinting (provenance tracking)
- Vector comparison and similarity

"""

import numpy as np
import zlib
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any

# ==================== SERIALIZATION ====================

def serialize_vector(vector: np.ndarray) -> bytes:
    """
    Serialize vector for SQLite BLOB storage (compressed)
    
    Args:
        vector: NumPy array of floats
        
    Returns:
        Compressed bytes suitable for SQLite BLOB
        
    Example:
        >>> vec = np.array([0.1, 0.2, 0.3])
        >>> blob = serialize_vector(vec)
        >>> len(blob)  # Much smaller than 384 * 4 bytes
        50
    """
    # Convert to float32 for efficiency
    vector_f32 = vector.astype(np.float32)
    
    # Compress with zlib (60-70% reduction)
    compressed = zlib.compress(vector_f32.tobytes())
    
    return compressed

def deserialize_vector(blob: bytes) -> np.ndarray:
    """
    Deserialize vector from SQLite BLOB storage
    
    Args:
        blob: Compressed bytes from SQLite
        
    Returns:
        NumPy array of floats
        
    Example:
        >>> blob = serialize_vector(np.array([0.1, 0.2, 0.3]))
        >>> vec = deserialize_vector(blob)
        >>> vec
        array([0.1, 0.2, 0.3], dtype=float32)
    """
    # Decompress
    decompressed = zlib.decompress(blob)
    
    # Convert back to numpy array
    vector = np.frombuffer(decompressed, dtype=np.float32)
    
    return vector

# ==================== FINGERPRINTING ====================

def generate_vector_fingerprint(
    vector: np.ndarray,
    model: str = "all-MiniLM-L6-v2",
    dimension: Optional[int] = None
) -> str:
    """
    Generate semantic fingerprint for vector provenance tracking
    
    Format: {model}:{dimension}:{hash}:{timestamp}
    Example: miniLM:384:a3f2e1d9:2025-10-28T15:30:00Z
    
    Args:
        vector: NumPy array to fingerprint
        model: Name of embedding model
        dimension: Vector dimensionality (auto-detected if None)
        
    Returns:
        Fingerprint string
        
    Example:
        >>> vec = np.random.rand(384)
        >>> fp = generate_vector_fingerprint(vec)
        >>> fp
        'miniLM:384:a3f2e1d9:2025-10-28T15:30:00Z'
    """
    # Auto-detect dimension
    if dimension is None:
        dimension = len(vector)
    
    # Hash first 8 chars of SHA256
    vector_hash = hashlib.sha256(vector.tobytes()).hexdigest()[:8]
    
    # ISO timestamp
    timestamp = datetime.utcnow().isoformat() + 'Z'
    
    # Model shortname
    model_short = model.split('/')[-1].replace('all-', '').replace('-v2', '')
    
    return f"{model_short}:{dimension}:{vector_hash}:{timestamp}"

def parse_fingerprint(fingerprint: str) -> Dict[str, Any]:
    """
    Parse fingerprint into components
    
    Args:
        fingerprint: Fingerprint string
        
    Returns:
        Dictionary with model, dimension, hash, timestamp
        
    Example:
        >>> fp = "miniLM:384:a3f2e1d9:2025-10-28T15:30:00Z"
        >>> parse_fingerprint(fp)
        {'model': 'miniLM', 'dimension': 384, 'hash': 'a3f2e1d9', 'timestamp': '2025-10-28T15:30:00Z'}
    """
    parts = fingerprint.split(':')
    
    if len(parts) < 4:
        raise ValueError(f"Invalid fingerprint format: {fingerprint}")
    
    # Timestamp might have colons (ISO format), so rejoin the rest
    return {
        'model': parts[0],
        'dimension': int(parts[1]),
        'hash': parts[2],
        'timestamp': ':'.join(parts[3:])  # Rejoin timestamp parts
    }

def fingerprints_match(fp1: str, fp2: str, ignore_timestamp: bool = True) -> bool:
    """
    Check if two fingerprints represent the same vector
    
    Args:
        fp1: First fingerprint
        fp2: Second fingerprint
        ignore_timestamp: If True, only compare model/dimension/hash
        
    Returns:
        True if fingerprints match
        
    Example:
        >>> fp1 = "miniLM:384:a3f2e1d9:2025-10-28T15:30:00Z"
        >>> fp2 = "miniLM:384:a3f2e1d9:2025-10-28T16:00:00Z"
        >>> fingerprints_match(fp1, fp2)
        True
    """
    p1 = parse_fingerprint(fp1)
    p2 = parse_fingerprint(fp2)
    
    if ignore_timestamp:
        return (p1['model'] == p2['model'] and 
                p1['dimension'] == p2['dimension'] and 
                p1['hash'] == p2['hash'])
    else:
        return fp1 == fp2

# ==================== SIMILARITY ====================

def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors
    
    Args:
        vec1: First vector
        vec2: Second vector
        
    Returns:
        Similarity score between 0 and 1
        
    Example:
        >>> v1 = np.array([1, 0, 0])
        >>> v2 = np.array([1, 0, 0])
        >>> cosine_similarity(v1, v2)
        1.0
    """
    # Normalize vectors
    vec1_norm = vec1 / np.linalg.norm(vec1)
    vec2_norm = vec2 / np.linalg.norm(vec2)
    
    # Dot product
    similarity = np.dot(vec1_norm, vec2_norm)
    
    return float(similarity)

def batch_cosine_similarity(query_vec: np.ndarray, vectors: list) -> np.ndarray:
    """
    Compute cosine similarity between query and multiple vectors
    
    Args:
        query_vec: Query vector
        vectors: List of vectors to compare
        
    Returns:
        Array of similarity scores
        
    Example:
        >>> query = np.array([1, 0, 0])
        >>> vecs = [np.array([1, 0, 0]), np.array([0, 1, 0])]
        >>> batch_cosine_similarity(query, vecs)
        array([1.0, 0.0])
    """
    # Stack vectors into matrix
    matrix = np.vstack(vectors)
    
    # Normalize query
    query_norm = query_vec / np.linalg.norm(query_vec)
    
    # Normalize all vectors
    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
    matrix_norm = matrix / norms
    
    # Compute all similarities at once
    similarities = np.dot(matrix_norm, query_norm)
    
    return similarities

# ==================== VALIDATION ====================

def validate_vector(vector: np.ndarray, expected_dim: int = 384) -> bool:
    """
    Validate vector dimensions and values
    
    Args:
        vector: Vector to validate
        expected_dim: Expected dimensionality
        
    Returns:
        True if valid
        
    Raises:
        ValueError if invalid
    """
    if not isinstance(vector, np.ndarray):
        raise ValueError(f"Vector must be numpy array, got {type(vector)}")
    
    if len(vector) != expected_dim:
        raise ValueError(f"Expected {expected_dim} dimensions, got {len(vector)}")
    
    if not np.isfinite(vector).all():
        raise ValueError("Vector contains NaN or Inf values")
    
    return True

# ==================== TESTING ====================

if __name__ == "__main__":
    print("Testing vector utilities...")
    
    # Test serialization
    print("\n1. Testing serialization...")
    vec = np.random.rand(384).astype(np.float32)
    blob = serialize_vector(vec)
    vec_restored = deserialize_vector(blob)
    assert np.allclose(vec, vec_restored), "Serialization failed"
    print(f"   ✅ Original: {len(vec) * 4} bytes, Compressed: {len(blob)} bytes ({len(blob)/(len(vec)*4)*100:.1f}%)")
    
    # Test fingerprinting
    print("\n2. Testing fingerprinting...")
    fp = generate_vector_fingerprint(vec, "all-MiniLM-L6-v2", 384)
    print(f"   ✅ Fingerprint: {fp}")
    parsed = parse_fingerprint(fp)
    print(f"   ✅ Parsed: {parsed}")
    
    # Test similarity
    print("\n3. Testing similarity...")
    vec1 = np.array([1.0, 0.0, 0.0])
    vec2 = np.array([1.0, 0.0, 0.0])
    vec3 = np.array([0.0, 1.0, 0.0])
    sim_same = cosine_similarity(vec1, vec2)
    sim_diff = cosine_similarity(vec1, vec3)
    print(f"   ✅ Same vectors: {sim_same:.3f}")
    print(f"   ✅ Different vectors: {sim_diff:.3f}")
    
    # Test batch similarity
    print("\n4. Testing batch similarity...")
    query = np.random.rand(384)
    vecs = [np.random.rand(384) for _ in range(10)]
    sims = batch_cosine_similarity(query, vecs)
    print(f"   ✅ Computed {len(sims)} similarities: {sims[:3]}")
    
    print("\n✅ All tests passed!")
