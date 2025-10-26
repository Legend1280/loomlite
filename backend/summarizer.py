"""
Document and Cluster Summarization Module
Generates LLM-powered summaries for documents, clusters, and refinement nodes
"""

import os
from openai import OpenAI

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("⚠️  WARNING: OPENAI_API_KEY not set! Summarization will fail.")
    client = None
else:
    client = OpenAI(api_key=api_key)
    print(f"✅ OpenAI client initialized (key: ...{api_key[-4:]})")

def generate_document_summary(doc_text: str, doc_title: str, clusters: list) -> str:
    """
    Generate a high-level summary of the entire document.
    Uses cluster summaries if available, otherwise uses raw text.
    
    Args:
        doc_text: Full text of the document
        doc_title: Title of the document
        clusters: List of cluster objects with labels and summaries
    
    Returns:
        str: A 2-3 sentence summary of the document
    """
    # If we have cluster summaries, use them for a bottom-up approach
    if clusters and any(c.get('summary') for c in clusters):
        cluster_info = "\n".join([
            f"- {c['label']}: {c.get('summary', 'No summary')}"
            for c in clusters
        ])
        
        prompt = f"""You are analyzing a document titled "{doc_title}".

The document has been organized into the following semantic clusters:

{cluster_info}

Based on these clusters, write a comprehensive 2-3 sentence summary that captures the main purpose and scope of this document. Focus on what the document is about and what key topics it covers.

Summary:"""
    else:
        # Fallback: use document text directly (truncate if too long)
        text_preview = doc_text[:4000] if len(doc_text) > 4000 else doc_text
        
        prompt = f"""You are analyzing a document titled "{doc_title}".

Here is the beginning of the document:

{text_preview}

Write a comprehensive 2-3 sentence summary that captures the main purpose and scope of this document. Focus on what the document is about and what key topics it covers.

Summary:"""
    
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a technical document analyst who creates clear, concise summaries."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=150
    )
    
    summary = response.choices[0].message.content.strip()
    return summary


def generate_cluster_summary(cluster_label: str, concepts: list, relations: list) -> str:
    """
    Generate a summary for a semantic cluster.
    
    Args:
        cluster_label: The LLM-generated label for this cluster
        concepts: List of concept objects in this cluster
        relations: List of relations between concepts in this cluster
    
    Returns:
        str: A 1-2 sentence summary of what this cluster represents
    """
    concept_labels = [c['label'] for c in concepts[:10]]  # Limit to first 10
    concept_list = ", ".join(concept_labels)
    
    prompt = f"""You are analyzing a semantic cluster of concepts from a document.

Cluster Name: {cluster_label}

Key Concepts in this cluster:
{concept_list}

Write a clear 1-2 sentence summary explaining what this cluster represents and why these concepts are grouped together. Focus on the semantic theme that unifies them.

Summary:"""
    
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a knowledge graph analyst who explains semantic relationships."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=100
    )
    
    summary = response.choices[0].message.content.strip()
    return summary


def generate_refinement_summary(refinement_label: str, parent_cluster_label: str, concepts: list) -> str:
    """
    Generate a summary for a refinement node (sub-theme within a cluster).
    
    Args:
        refinement_label: The label for this refinement node
        parent_cluster_label: The label of the parent cluster
        concepts: List of concept objects under this refinement
    
    Returns:
        str: A 1 sentence summary of this refinement theme
    """
    concept_labels = [c['label'] for c in concepts[:8]]
    concept_list = ", ".join(concept_labels)
    
    prompt = f"""You are analyzing a refinement node within a semantic cluster.

Parent Cluster: {parent_cluster_label}
Refinement Theme: {refinement_label}

Concepts in this refinement:
{concept_list}

Write a clear 1 sentence summary explaining this specific sub-theme within the broader cluster.

Summary:"""
    
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are a knowledge graph analyst who explains semantic relationships."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=80
    )
    
    summary = response.choices[0].message.content.strip()
    return summary


def summarize_document_hierarchy(doc_id: str, doc_text: str, doc_title: str, concepts: list, relations: list, db_conn):
    """
    Generate summaries for the entire document hierarchy and store them in the database.
    
    This is the main entry point for the summarization pipeline.
    It should be called after semantic clustering is complete.
    
    Args:
        doc_id: Document ID
        doc_text: Full document text
        doc_title: Document title
        concepts: All concepts extracted from the document
        relations: All relations between concepts
        db_conn: Database connection
    """
    print(f"\n🔄 Starting summarization for document {doc_id}...")
    print(f"   Title: {doc_title}")
    print(f"   Concepts: {len(concepts)}")
    print(f"   Relations: {len(relations)}")
    
    if not client:
        print("❌ Summarization skipped: OpenAI client not initialized (missing API key)")
        return {"error": "OpenAI API key not configured"}
    
    cursor = db_conn.cursor()
    
    # 1. Identify clusters (hierarchy_level = 1)
    clusters = [c for c in concepts if c.get('hierarchy_level') == 1]
    
    # 2. Generate cluster summaries
    print(f"\n📊 Found {len(clusters)} clusters to summarize")
    for cluster in clusters:
        cluster_id = cluster['id']
        cluster_label = cluster['label']
        
        print(f"\n🧠 Summarizing cluster: {cluster_label} (id: {cluster_id})")
        
        # Get concepts in this cluster
        cluster_concepts = [
            c for c in concepts 
            if c.get('parent_cluster_id') == cluster_id and c.get('hierarchy_level') == 3
        ]
        
        print(f"   Found {len(cluster_concepts)} concepts in cluster")
        
        # Get relations within this cluster
        cluster_concept_ids = {c['id'] for c in cluster_concepts}
        cluster_relations = [
            r for r in relations 
            if r['src'] in cluster_concept_ids and r['dst'] in cluster_concept_ids
        ]
        
        print(f"   Found {len(cluster_relations)} relations in cluster")
        print(f"   Calling OpenAI to generate summary...")
        
        # Generate summary
        try:
            cluster_summary = generate_cluster_summary(cluster_label, cluster_concepts, cluster_relations)
            print(f"   ✅ Summary generated: {cluster_summary[:100]}...")
        except Exception as e:
            print(f"   ❌ Summary generation failed: {e}")
            import traceback
            traceback.print_exc()
            cluster_summary = None
        
        if cluster_summary:
            # Update database
            print(f"   Writing summary to database...")
            cursor.execute(
                "UPDATE concepts SET summary = ? WHERE id = ?",
                (cluster_summary, cluster_id)
            )
            print(f"   ✅ Database updated")
            
            # Store summary in cluster object for document summary generation
            cluster['summary'] = cluster_summary
        else:
            print(f"   ⚠️  Skipping database update (no summary generated)")
    
    # 3. Identify refinement nodes (hierarchy_level = 2)
    refinements = [c for c in concepts if c.get('hierarchy_level') == 2]
    
    for refinement in refinements:
        refinement_id = refinement['id']
        refinement_label = refinement['label']
        parent_cluster_id = refinement.get('parent_cluster_id')
        
        # Find parent cluster
        parent_cluster = next((c for c in clusters if c['id'] == parent_cluster_id), None)
        parent_cluster_label = parent_cluster['label'] if parent_cluster else "Unknown"
        
        # Get concepts under this refinement
        refinement_concepts = [
            c for c in concepts 
            if c.get('parent_concept_id') == refinement_id and c.get('hierarchy_level') == 3
        ]
        
        # Generate summary
        refinement_summary = generate_refinement_summary(
            refinement_label, 
            parent_cluster_label, 
            refinement_concepts
        )
        
        # Update database
        cursor.execute(
            "UPDATE concepts SET summary = ? WHERE id = ?",
            (refinement_summary, refinement_id)
        )
    
    # 4. Generate document summary (root)
    doc_summary = generate_document_summary(doc_text, doc_title, clusters)
    
    # Update database
    cursor.execute(
        "UPDATE documents SET summary = ? WHERE id = ?",
        (doc_summary, doc_id)
    )
    
    db_conn.commit()
    
    print(f"✅ Generated summaries for document {doc_id}")
    print(f"   - Document summary: {doc_summary[:100]}...")
    print(f"   - {len(clusters)} cluster summaries")
    print(f"   - {len(refinements)} refinement summaries")
    
    return {
        "document_summary": doc_summary,
        "cluster_count": len(clusters),
        "refinement_count": len(refinements)
    }

