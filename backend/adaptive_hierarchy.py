"""
Adaptive Hierarchy Builder for Loom Lite v2.4
Creates dynamic multi-level hierarchies based on document complexity
"""

from typing import List, Dict, Tuple
from collections import defaultdict
from models import Concept, Relation, MicroOntology
import os
from openai import OpenAI

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


def determine_hierarchy_depth(doc_length: int, concept_count: int, cluster_count: int) -> int:
    """
    Dynamically determine how many hierarchy levels to create based on document complexity.
    
    Args:
        doc_length: Word count of document
        concept_count: Number of atomic concepts
        cluster_count: Number of semantic clusters
    
    Returns:
        int: Target hierarchy depth (4-6 levels)
    """
    # Base: Always have at least 4 levels (Doc -> Cluster -> Refinement -> Concept)
    depth = 4
    
    # Add level 5 (Sub-concepts) if document is medium-large
    if doc_length > 2000 or concept_count > 40:
        depth = 5
    
    # Add level 6 (Micro-concepts) if document is very large and complex
    if doc_length > 5000 or concept_count > 80:
        depth = 6
    
    return depth


def build_adaptive_hierarchy(concepts: List[Concept], clusters: List[Dict], 
                             relation_graph: Dict, doc_length: int) -> List[Concept]:
    """
    Build an adaptive hierarchy that scales with document complexity.
    
    Hierarchy Structure:
    - Level 1: Document (root)
    - Level 2: Clusters (semantic themes)
    - Level 3: Refinements (sub-themes within clusters)
    - Level 4: Concepts (atomic ideas)
    - Level 5: Sub-concepts (detailed breakdowns) [optional]
    - Level 6: Micro-concepts (finest granularity) [optional]
    
    Args:
        concepts: List of atomic concepts
        clusters: List of cluster dictionaries
        relation_graph: Adjacency list of relations
        doc_length: Word count of document
    
    Returns:
        List of concepts with hierarchy levels assigned
    """
    
    # Determine target depth
    target_depth = determine_hierarchy_depth(doc_length, len(concepts), len(clusters))
    
    print(f"📊 Adaptive Hierarchy: Target depth = {target_depth} levels")
    print(f"   Document length: {doc_length} words")
    print(f"   Concepts: {len(concepts)}")
    print(f"   Clusters: {len(clusters)}")
    
    # Build hierarchy bottom-up
    hierarchical_concepts = []
    
    for cluster_idx, cluster in enumerate(clusters):
        cluster_id = cluster['id']
        cluster_concepts = cluster['concepts']
        
        # Level 2: Cluster node
        cluster_concept = Concept(
            id=cluster_id,
            doc_id=cluster['doc_id'],
            label=cluster['label'],
            type="Cluster",
            confidence=cluster.get('coherence', 0.85),
            hierarchy_level=2,
            parent_cluster_id=None,
            parent_concept_id=None,
            coherence=cluster.get('coherence', 0.85)
        )
        hierarchical_concepts.append(cluster_concept)
        
        # Determine if this cluster needs refinement layers
        needs_refinement = len(cluster_concepts) > 5
        
        if needs_refinement and target_depth >= 3:
            # Level 3: Create refinement nodes (sub-themes)
            refinement_groups = create_refinement_groups(cluster_concepts, relation_graph)
            
            for ref_idx, ref_group in enumerate(refinement_groups):
                ref_id = f"{cluster_id}_ref_{ref_idx}"
                ref_label = generate_refinement_label(ref_group, cluster['label'])
                
                refinement_concept = Concept(
                    id=ref_id,
                    doc_id=cluster['doc_id'],
                    label=ref_label,
                    type="Refinement",
                    confidence=0.80,
                    hierarchy_level=3,
                    parent_cluster_id=cluster_id,
                    parent_concept_id=None,
                    coherence=0.80
                )
                hierarchical_concepts.append(refinement_concept)
                
                # Level 4+: Assign atomic concepts and potentially create sub-levels
                for concept in ref_group:
                    if target_depth == 4:
                        # Simple 4-level hierarchy
                        concept.hierarchy_level = 4
                        concept.parent_cluster_id = cluster_id
                        concept.parent_concept_id = ref_id
                    
                    elif target_depth >= 5:
                        # Complex hierarchy: check if concept should have sub-concepts
                        if should_create_subconcepts(concept, relation_graph):
                            # This becomes a Level 4 concept with Level 5 children
                            concept.hierarchy_level = 4
                            concept.parent_cluster_id = cluster_id
                            concept.parent_concept_id = ref_id
                            
                            # Create sub-concepts (Level 5)
                            sub_concepts = create_sub_concepts(concept, relation_graph, cluster['doc_id'])
                            for sub in sub_concepts:
                                sub.hierarchy_level = 5
                                sub.parent_cluster_id = cluster_id
                                sub.parent_concept_id = concept.id
                                hierarchical_concepts.append(sub)
                        else:
                            # Regular Level 4 concept
                            concept.hierarchy_level = 4
                            concept.parent_cluster_id = cluster_id
                            concept.parent_concept_id = ref_id
                    
                    hierarchical_concepts.append(concept)
        else:
            # Small cluster: no refinement needed, concepts go directly under cluster
            for concept in cluster_concepts:
                concept.hierarchy_level = 4 if target_depth >= 4 else 3
                concept.parent_cluster_id = cluster_id
                concept.parent_concept_id = None
                hierarchical_concepts.append(concept)
    
    print(f"✅ Adaptive Hierarchy Built: {len(hierarchical_concepts)} total nodes")
    level_counts = defaultdict(int)
    for c in hierarchical_concepts:
        level_counts[c.hierarchy_level] += 1
    for level in sorted(level_counts.keys()):
        print(f"   Level {level}: {level_counts[level]} nodes")
    
    return hierarchical_concepts


def create_refinement_groups(concepts: List[Concept], relation_graph: Dict) -> List[List[Concept]]:
    """
    Group concepts into refinement sub-themes based on relation density.
    Uses a simple heuristic: concepts with many shared relations go together.
    """
    if len(concepts) <= 5:
        return [concepts]  # Too small to refine
    
    # Simple grouping: divide into 2-3 groups based on relation patterns
    # For now, use a basic approach: sort by relation count and split
    concept_relation_counts = []
    for concept in concepts:
        relation_count = len(relation_graph.get(concept.id, []))
        concept_relation_counts.append((concept, relation_count))
    
    # Sort by relation density
    concept_relation_counts.sort(key=lambda x: x[1], reverse=True)
    
    # Split into groups of ~3-5 concepts
    group_size = max(3, len(concepts) // 3)
    groups = []
    for i in range(0, len(concepts), group_size):
        group = [c for c, _ in concept_relation_counts[i:i+group_size]]
        if group:
            groups.append(group)
    
    return groups


def generate_refinement_label(concepts: List[Concept], parent_label: str) -> str:
    """
    Generate a semantic label for a refinement group using LLM.
    """
    concept_labels = [c.label for c in concepts[:5]]
    concept_list = ", ".join(concept_labels)
    
    prompt = f"""You are analyzing a sub-group within the cluster "{parent_label}".

The sub-group contains these concepts:
{concept_list}

Generate a short, semantic label (2-4 words) that describes this specific sub-theme. The label should be more specific than the parent cluster but still capture the essence of the group.

Label:"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You are a knowledge graph analyst who creates semantic labels."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=20
        )
        label = response.choices[0].message.content.strip()
        return label
    except Exception as e:
        print(f"⚠️  LLM labeling failed: {e}")
        return f"{parent_label} - Refinement"


def should_create_subconcepts(concept: Concept, relation_graph: Dict) -> bool:
    """
    Determine if a concept is complex enough to warrant sub-concepts.
    Criteria: Has 3+ outgoing relations or is a complex type.
    """
    outgoing_relations = len(relation_graph.get(concept.id, []))
    complex_types = {"Process", "Technology", "Feature", "Project"}
    
    return outgoing_relations >= 3 or concept.type in complex_types


def create_sub_concepts(parent_concept: Concept, relation_graph: Dict, doc_id: str) -> List[Concept]:
    """
    Create sub-concepts for a complex parent concept.
    This is a placeholder - in a full implementation, you'd analyze the concept's
    relations and create meaningful sub-divisions.
    """
    # For now, create 2-3 synthetic sub-concepts based on relation types
    sub_concepts = []
    relations = relation_graph.get(parent_concept.id, [])
    
    # Group relations by type
    relation_types = defaultdict(list)
    for rel in relations:
        relation_types[rel['rel']].append(rel)
    
    # Create a sub-concept for each major relation type
    for idx, (rel_type, rels) in enumerate(list(relation_types.items())[:3]):
        sub_id = f"{parent_concept.id}_sub_{idx}"
        sub_label = f"{parent_concept.label} - {rel_type.replace('_', ' ').title()}"
        
        sub_concept = Concept(
            id=sub_id,
            doc_id=doc_id,
            label=sub_label,
            type=parent_concept.type,
            confidence=0.75,
            hierarchy_level=5,  # Will be set by caller
            parent_cluster_id=None,  # Will be set by caller
            parent_concept_id=parent_concept.id,
            coherence=0.75
        )
        sub_concepts.append(sub_concept)
    
    return sub_concepts

