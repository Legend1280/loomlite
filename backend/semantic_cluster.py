"""
Semantic Clustering Module for Loom Lite v2.3
Introduces mid-tier hierarchy to flat ontology structures
"""

from typing import List, Dict, Set, Tuple, Optional
from collections import defaultdict
import re
import os
from openai import OpenAI
from models import Concept, Relation, MicroOntology

# Initialize OpenAI client for cluster labeling
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


# ============================================================================
# Configuration
# ============================================================================

CLUSTERING_CONFIG = {
    "similarity_threshold": 0.80,  # Merge if cosine >= value
    "min_span_length": 6,  # Ignore spans shorter than n words
    "coherence_threshold": 0.75,  # Average relation confidence >= value
    "max_cluster_depth": 4,  # Prevent deep recursion
    "cluster_relations": {"defines", "contains", "supports", "develops"},  # Relations that indicate hierarchy
}


# ============================================================================
# Clustering Functions
# ============================================================================

def build_semantic_hierarchy(ontology: MicroOntology) -> MicroOntology:
    """
    Build semantic hierarchy for concepts in a micro-ontology.
    
    Args:
        ontology: Input micro-ontology with flat concepts
        
    Returns:
        Enhanced ontology with parent_cluster_id and hierarchy_level assigned
    """
    # Step 1: Filter low-quality concepts
    filtered_concepts = filter_concepts(ontology.concepts, ontology.mentions)
    
    # Step 2: Build relation graph
    relation_graph = build_relation_graph(ontology.relations)
    
    # Step 3: Identify clusters based on relations
    clusters = identify_clusters(filtered_concepts, relation_graph)
    
    # Step 4: Create cluster concepts with LLM-generated labels
    cluster_concepts = create_cluster_concepts(clusters, ontology.doc.doc_id, filtered_concepts)
    
    # Step 5: Build intra-cluster refinement
    refined_concepts = build_intra_cluster_hierarchy(filtered_concepts, cluster_concepts, clusters, relation_graph)
    
    # Step 6: Assign hierarchy levels
    all_concepts = assign_hierarchy_levels(refined_concepts, cluster_concepts, relation_graph)
    
    # Step 7: Update ontology
    ontology.concepts = all_concepts
    
    return ontology


def filter_concepts(concepts: List[Concept], mentions: Dict[str, List]) -> List[Concept]:
    """
    Filter out low-quality concepts based on span length and coherence.
    
    Args:
        concepts: List of concepts
        mentions: Mention links (concept_id -> [MentionLink])
        
    Returns:
        Filtered list of concepts
    """
    filtered = []
    
    for concept in concepts:
        # Check if concept has mentions
        concept_mentions = mentions.get(concept.concept_id, [])
        if not concept_mentions:
            # Keep concepts without mentions (might be clusters)
            filtered.append(concept)
            continue
        
        # Check label length (word count)
        word_count = len(concept.label.split())
        if word_count < CLUSTERING_CONFIG["min_span_length"]:
            continue
        
        # Check coherence (if available)
        if concept.coherence and concept.coherence < CLUSTERING_CONFIG["coherence_threshold"]:
            continue
        
        filtered.append(concept)
    
    return filtered


def build_relation_graph(relations: List[Relation]) -> Dict[str, List[Tuple[str, str]]]:
    """
    Build a graph of concept relationships.
    
    Args:
        relations: List of relations
        
    Returns:
        Graph as dict: concept_id -> [(relation_type, target_concept_id)]
    """
    graph = defaultdict(list)
    
    for relation in relations:
        graph[relation.src].append((relation.rel, relation.dst))
        # Add reverse edge for bidirectional traversal
        graph[relation.dst].append((f"~{relation.rel}", relation.src))
    
    return graph


def identify_clusters(concepts: List[Concept], relation_graph: Dict[str, List[Tuple[str, str]]]) -> List[Set[str]]:
    """
    Identify concept clusters based on strong relations.
    
    Args:
        concepts: List of concepts
        relation_graph: Relation graph
        
    Returns:
        List of clusters (each cluster is a set of concept_ids)
    """
    clusters = []
    visited = set()
    cluster_relations = CLUSTERING_CONFIG["cluster_relations"]
    
    for concept in concepts:
        if concept.concept_id in visited:
            continue
        
        # Start a new cluster
        cluster = {concept.concept_id}
        queue = [concept.concept_id]
        
        while queue:
            current_id = queue.pop(0)
            
            # Get related concepts
            for rel_type, target_id in relation_graph.get(current_id, []):
                # Only follow clustering relations
                if rel_type not in cluster_relations:
                    continue
                
                if target_id not in visited and target_id not in cluster:
                    cluster.add(target_id)
                    queue.append(target_id)
            
            visited.add(current_id)
        
        # Only create cluster if it has multiple concepts
        if len(cluster) >= 2:
            clusters.append(cluster)
    
    return clusters


def create_cluster_concepts(clusters: List[Set[str]], doc_id: str, all_concepts: List[Concept]) -> List[Concept]:
    """
    Create cluster concepts (mid-tier semantic nodes) with LLM-generated labels.
    
    Args:
        clusters: List of concept ID sets
        doc_id: Document ID
        all_concepts: All concepts (to get labels for cluster members)
        
    Returns:
        List of cluster concepts with semantic labels
    """
    cluster_concepts = []
    
    # Create concept ID to label mapping
    concept_map = {c.concept_id: c.label for c in all_concepts}
    
    for i, cluster in enumerate(clusters):
        cluster_id = f"cluster_{doc_id}_{i}"
        
        # Get labels of concepts in this cluster
        cluster_labels = [concept_map.get(cid, "") for cid in cluster if cid in concept_map]
        cluster_labels = [label for label in cluster_labels if label]  # Remove empty
        
        # Generate semantic cluster label using LLM
        cluster_label = generate_llm_cluster_label(cluster_labels)
        
        cluster_concept = Concept(
            concept_id=cluster_id,
            doc_id=doc_id,
            label=cluster_label,
            type="Topic",  # Clusters are topics/themes
            confidence=1.0,
            hierarchy_level=1,  # Clusters are level 1 (per ONTOLOGY_STANDARD v1.3)
            coherence=1.0,
        )
        
        cluster_concepts.append(cluster_concept)
    
    return cluster_concepts


def build_intra_cluster_hierarchy(
    concepts: List[Concept],
    cluster_concepts: List[Concept],
    clusters: List[Set[str]],
    relation_graph: Dict[str, List[Tuple[str, str]]]
) -> List[Concept]:
    """
    Build intra-cluster hierarchical refinement.
    Creates mid-tier refinement nodes within each cluster.
    
    Args:
        concepts: Original concepts
        cluster_concepts: Cluster concepts (level 2)
        clusters: List of concept ID sets per cluster
        relation_graph: Relation graph
        
    Returns:
        Concepts with refinement nodes added and parent_concept_id assigned
    """
    all_refined_concepts = []
    concept_map = {c.concept_id: c for c in concepts}
    
    for i, (cluster_concept, cluster_ids) in enumerate(zip(cluster_concepts, clusters)):
        # Get concepts in this cluster
        cluster_members = [concept_map[cid] for cid in cluster_ids if cid in concept_map]
        
        if len(cluster_members) <= 3:
            # Too small to refine, keep flat
            for concept in cluster_members:
                concept.parent_cluster_id = cluster_concept.concept_id
                concept.hierarchy_level = 3  # Direct children of cluster (level 3 per ONTOLOGY_STANDARD v1.3)
            all_refined_concepts.extend(cluster_members)
            continue
        
        # Identify refinement groups within cluster using semantic similarity
        refinement_groups = identify_refinement_groups(cluster_members, relation_graph)
        
        # Create refinement concepts (level 3)
        for j, group in enumerate(refinement_groups):
            if len(group) == 1:
                # Single concept, attach directly to cluster
                concept = group[0]
                concept.parent_cluster_id = cluster_concept.concept_id
                concept.hierarchy_level = 3  # Atomic concept (level 3 per ONTOLOGY_STANDARD v1.3)
                all_refined_concepts.append(concept)
            else:
                # Create refinement node
                refinement_id = f"{cluster_concept.concept_id}_ref_{j}"
                group_labels = [c.label for c in group]
                
                # Generate refinement label using LLM
                refinement_label = generate_llm_cluster_label(group_labels)
                
                refinement_concept = Concept(
                    concept_id=refinement_id,
                    doc_id=cluster_concept.doc_id,
                    label=refinement_label,
                    type="Topic",
                    confidence=0.9,
                    parent_cluster_id=cluster_concept.concept_id,  # Parent is cluster
                    hierarchy_level=2,  # Refinement level (level 2 per ONTOLOGY_STANDARD v1.3)
                    coherence=0.9,
                )
                
                all_refined_concepts.append(refinement_concept)
                
                # Attach concepts to refinement node
                for concept in group:
                    concept.parent_cluster_id = cluster_concept.concept_id
                    concept.parent_concept_id = refinement_id  # NEW: Parent refinement
                    concept.hierarchy_level = 3  # Atomic concept level (level 3 per ONTOLOGY_STANDARD v1.3)
                    all_refined_concepts.append(concept)
    
    return all_refined_concepts


def identify_refinement_groups(
    concepts: List[Concept],
    relation_graph: Dict[str, List[Tuple[str, str]]]
) -> List[List[Concept]]:
    """
    Identify sub-groups within a cluster for refinement.
    Uses relation strength and label similarity.
    
    Args:
        concepts: Concepts in the cluster
        relation_graph: Relation graph
        
    Returns:
        List of concept groups (each group becomes a refinement node)
    """
    # Simple heuristic: group by relation density
    # More sophisticated: use cosine similarity on embeddings
    
    groups = []
    visited = set()
    
    for concept in concepts:
        if concept.concept_id in visited:
            continue
        
        # Start a new group
        group = [concept]
        visited.add(concept.concept_id)
        
        # Find related concepts
        for rel_type, target_id in relation_graph.get(concept.concept_id, []):
            if target_id in visited:
                continue
            
            # Check if target is in this cluster
            target_concept = next((c for c in concepts if c.concept_id == target_id), None)
            if target_concept and rel_type in {"defines", "contains", "supports"}:
                group.append(target_concept)
                visited.add(target_id)
        
        # Only create group if it has 2+ concepts
        if len(group) >= 2:
            groups.append(group)
        else:
            # Single concept group
            groups.append(group)
    
    # Add any unvisited concepts as singles
    for concept in concepts:
        if concept.concept_id not in visited:
            groups.append([concept])
            visited.add(concept.concept_id)
    
    return groups


def assign_hierarchy_levels(
    concepts: List[Concept],
    cluster_concepts: List[Concept],
    relation_graph: Dict[str, List[Tuple[str, str]]]
) -> List[Concept]:
    """
    Assign hierarchy levels and parent_cluster_id to all concepts.
    
    Args:
        concepts: Refined concepts (already have parent_cluster_id and parent_concept_id set)
        cluster_concepts: Cluster concepts
        relation_graph: Relation graph
        
    Returns:
        All concepts with hierarchy assigned
    """
    # The concepts parameter already has parent_cluster_id and hierarchy_level set
    # by build_intra_cluster_hierarchy(). We just need to combine them with cluster concepts.
    
    all_concepts = []
    
    # Add cluster concepts (level 2)
    all_concepts.extend(cluster_concepts)
    
    # Add refined concepts (levels 3 and 4, already have parent assignments)
    all_concepts.extend(concepts)
    
    return all_concepts


# ============================================================================
# Utility Functions
# ============================================================================

def generate_llm_cluster_label(concept_labels: List[str]) -> str:
    """
    Use LLM to generate a semantic label for a cluster of concepts.
    
    Args:
        concept_labels: List of concept labels in the cluster
        
    Returns:
        Semantic cluster label (2-4 words)
    """
    if not concept_labels:
        return "Unnamed Cluster"
    
    # Limit to first 10 concepts to keep prompt concise
    sample_labels = concept_labels[:10]
    
    prompt = f'''Given these related concepts from a document:
{", ".join(sample_labels)}

Suggest a concise, semantic category name (2-4 words) that captures their common theme.
Return ONLY the category name, nothing else.

Examples:
- ["revenue", "pricing", "subscription"] → "Revenue Models"
- ["doctor", "nurse", "clinic"] → "Clinical Staff"
- ["Q1 2024", "deadline", "launch"] → "Project Timeline"
- ["Builders Phase", "Founders Phase", "MSO"] → "Project Phases"

Category name:'''
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=15
        )
        
        label = response.choices[0].message.content.strip()
        
        # Clean up the label (remove quotes, extra whitespace)
        label = label.strip('"\'\'').strip()
        
        # Fallback if label is too long or empty
        if not label or len(label) > 50:
            return concept_labels[0]  # Use first concept as fallback
        
        return label
        
    except Exception as e:
        # Fallback to first concept label on error
        print(f"⚠️  LLM cluster labeling failed: {e}")
        return concept_labels[0] if concept_labels else "Unnamed Cluster"


def generate_cluster_label(concept_ids: Set[str], concepts: List[Concept]) -> str:
    """
    Generate a meaningful label for a cluster.
    
    Args:
        concept_ids: Set of concept IDs in the cluster
        concepts: All concepts
        
    Returns:
        Cluster label
    """
    # Find concepts in cluster
    cluster_concepts = [c for c in concepts if c.concept_id in concept_ids]
    
    if not cluster_concepts:
        return "Unnamed Cluster"
    
    # Use most common words in concept labels
    words = []
    for concept in cluster_concepts:
        words.extend(concept.label.split())
    
    # Simple frequency-based naming
    word_freq = defaultdict(int)
    for word in words:
        if len(word) > 3:  # Ignore short words
            word_freq[word] += 1
    
    if not word_freq:
        return cluster_concepts[0].label
    
    # Get top 2 most common words
    top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:2]
    return " ".join([w[0] for w in top_words])


def merge_redundant_concepts(concepts: List[Concept], similarity_threshold: float = 0.9) -> List[Concept]:
    """
    Merge concepts with very similar labels.
    
    Args:
        concepts: List of concepts
        similarity_threshold: Threshold for merging
        
    Returns:
        Deduplicated concepts
    """
    # Simple string similarity (Jaccard)
    def jaccard_similarity(a: str, b: str) -> float:
        set_a = set(a.lower().split())
        set_b = set(b.lower().split())
        intersection = len(set_a & set_b)
        union = len(set_a | set_b)
        return intersection / union if union > 0 else 0.0
    
    merged = []
    skip_ids = set()
    
    for i, concept_a in enumerate(concepts):
        if concept_a.concept_id in skip_ids:
            continue
        
        # Check for similar concepts
        for j in range(i + 1, len(concepts)):
            concept_b = concepts[j]
            
            if concept_b.concept_id in skip_ids:
                continue
            
            similarity = jaccard_similarity(concept_a.label, concept_b.label)
            
            if similarity >= similarity_threshold:
                # Merge concept_b into concept_a
                if concept_b.aliases:
                    if not concept_a.aliases:
                        concept_a.aliases = []
                    concept_a.aliases.extend(concept_b.aliases)
                
                skip_ids.add(concept_b.concept_id)
        
        merged.append(concept_a)
    
    return merged

