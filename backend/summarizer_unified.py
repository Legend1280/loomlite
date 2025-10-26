"""
Unified Document Summarization Module (ONTOLOGY_STANDARD v1.4-preview)
Reflective Layer Enhancement - Non-canonical derived field generation
Upgrade from v1.3: Single-call summarization for efficiency

Generates all summaries (document + clusters + refinements) in a single LLM call
Operates only on derived 'summary' fields without modifying ontology structure
"""

import os
import json
from openai import OpenAI

# Initialize OpenAI client
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("⚠️  WARNING: OPENAI_API_KEY not set! Summarization will fail.")
    client = None
else:
    client = OpenAI(api_key=api_key)
    print(f"✅ OpenAI client initialized (key: ...{api_key[-4:]})")


def generate_all_summaries_unified(doc_text: str, doc_title: str, clusters: list, refinements: list) -> dict:
    """
    Generate all summaries in a single LLM call (ONTOLOGY_STANDARD v1.4-preview)
    
    This is a Reflective Layer Enhancement that operates on derived fields only.
    Does not modify ontology structure, concepts, relations, or spans.
    
    Args:
        doc_text: Full document text (truncated to 4000 chars)
        doc_title: Document title
        clusters: List of cluster objects with 'label' and child concepts
        refinements: List of refinement objects with 'label' and child concepts
    
    Returns:
        dict: {
            "document_summary": str,
            "cluster_summaries": {cluster_label: summary_str},
            "refinement_summaries": {refinement_label: summary_str}
        }
    """
    if not client:
        print("❌ OpenAI client not initialized")
        return None
    
    # Truncate document text if too long
    text_preview = doc_text[:4000] if len(doc_text) > 4000 else doc_text
    
    # Build cluster descriptions
    cluster_descriptions = []
    for cluster in clusters:
        cluster_label = cluster.get('label', 'Unknown')
        # Get child concept labels (hierarchy_level = 3)
        child_concepts = cluster.get('_child_concepts', [])
        concept_labels = [c.get('label', '') for c in child_concepts[:5]]  # Limit to 5 for brevity
        
        cluster_descriptions.append(f"- **{cluster_label}**: {', '.join(concept_labels)}")
    
    # Build refinement descriptions
    refinement_descriptions = []
    for refinement in refinements:
        refinement_label = refinement.get('label', 'Unknown')
        parent_cluster = refinement.get('_parent_cluster_label', 'Unknown')
        child_concepts = refinement.get('_child_concepts', [])
        concept_labels = [c.get('label', '') for c in child_concepts[:5]]
        
        refinement_descriptions.append(f"- **{refinement_label}** (under {parent_cluster}): {', '.join(concept_labels)}")
    
    # Construct unified prompt
    prompt = f"""You are analyzing a document titled "{doc_title}".

Document preview:
{text_preview[:2000]}

The document has been semantically organized into the following structure:

**Clusters (top-level themes):**
{chr(10).join(cluster_descriptions) if cluster_descriptions else "None"}

**Refinements (sub-themes):**
{chr(10).join(refinement_descriptions) if refinement_descriptions else "None"}

Generate summaries for each level in JSON format. Each summary should be concise and capture the essence of that semantic grouping.

Requirements:
- Document summary: 2-3 sentences capturing the main purpose and scope
- Cluster summaries: 1 sentence each describing the theme
- Refinement summaries: 1 sentence each describing the sub-theme

Return ONLY valid JSON in this exact format:
{{
  "document_summary": "...",
  "cluster_summaries": {{
    "{clusters[0].get('label', 'Cluster1') if clusters else 'Example'}": "..."
  }},
  "refinement_summaries": {{
    "{refinements[0].get('label', 'Refinement1') if refinements else 'Example'}": "..."
  }}
}}
"""
    
    print(f"\n🔄 Unified summarization: {len(clusters)} clusters, {len(refinements)} refinements")
    print(f"   Calling OpenAI with gpt-4.1-mini...")
    
    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You are a technical document analyst. You generate structured JSON summaries. Always return valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=800,
            response_format={"type": "json_object"}  # Force JSON output
        )
        
        result_text = response.choices[0].message.content.strip()
        print(f"   ✅ Received response ({len(result_text)} chars)")
        
        # Parse JSON
        summaries = json.loads(result_text)
        
        # Validate structure
        if "document_summary" not in summaries:
            summaries["document_summary"] = None
        if "cluster_summaries" not in summaries:
            summaries["cluster_summaries"] = {}
        if "refinement_summaries" not in summaries:
            summaries["refinement_summaries"] = {}
        
        print(f"   ✅ Parsed {len(summaries.get('cluster_summaries', {}))} cluster summaries")
        print(f"   ✅ Parsed {len(summaries.get('refinement_summaries', {}))} refinement summaries")
        
        return summaries
        
    except json.JSONDecodeError as e:
        print(f"   ❌ JSON parse error: {e}")
        print(f"   Response: {result_text[:200]}...")
        return None
    except Exception as e:
        print(f"   ❌ Summarization failed: {e}", flush=True)
        import traceback
        traceback.print_exc()
        return None


def summarize_document_hierarchy_unified(doc_id: str, doc_text: str, doc_title: str, concepts: list, db_conn):
    """
    Main entry point for unified summarization (ONTOLOGY_STANDARD v1.4-preview)
    
    Generates all summaries in a single LLM call and writes to database.
    Operates only on derived 'summary' fields without modifying ontology structure.
    
    Args:
        doc_id: Document ID
        doc_text: Full document text
        doc_title: Document title
        concepts: List of all concept dicts from ontology
        db_conn: Database connection
    """
    print(f"\n🔄 Starting unified summarization for document {doc_id}", flush=True)
    print(f"   Title: {doc_title}", flush=True)
    print(f"   Total concepts: {len(concepts)}", flush=True)
    
    if not client:
        print("❌ Summarization skipped: OpenAI client not initialized")
        return {"error": "OpenAI API key not configured"}
    
    cursor = db_conn.cursor()
    
    # Separate concepts by hierarchy level
    clusters = [c for c in concepts if c.get('hierarchy_level') == 1]
    refinements = [c for c in concepts if c.get('hierarchy_level') == 2]
    atomic_concepts = [c for c in concepts if c.get('hierarchy_level') == 3]
    
    print(f"   Hierarchy: {len(clusters)} clusters, {len(refinements)} refinements, {len(atomic_concepts)} concepts", flush=True)
    
    # Attach child concepts to clusters and refinements for context
    for cluster in clusters:
        cluster['_child_concepts'] = [
            c for c in atomic_concepts 
            if c.get('parent_cluster_id') == cluster['id']
        ]
    
    for refinement in refinements:
        refinement['_child_concepts'] = [
            c for c in atomic_concepts 
            if c.get('parent_concept_id') == refinement['id']
        ]
        # Find parent cluster label
        parent_cluster_id = refinement.get('parent_cluster_id')
        parent_cluster = next((c for c in clusters if c['id'] == parent_cluster_id), None)
        refinement['_parent_cluster_label'] = parent_cluster.get('label', 'Unknown') if parent_cluster else 'Unknown'
    
    # Generate all summaries in one call
    summaries = generate_all_summaries_unified(doc_text, doc_title, clusters, refinements)
    
    if not summaries:
        print("❌ Unified summarization failed")
        return {"error": "Summarization failed"}
    
    # Write summaries to database
    print(f"\n💾 Writing summaries to database...", flush=True)
    
    # 1. Document summary
    doc_summary = summaries.get("document_summary")
    if doc_summary:
        cursor.execute(
            "UPDATE documents SET summary = ? WHERE id = ?",
            (doc_summary, doc_id)
        )
        print(f"   ✅ Document summary: {doc_summary[:80]}...")
    
    # 2. Cluster summaries
    cluster_summaries = summaries.get("cluster_summaries", {})
    for cluster in clusters:
        cluster_label = cluster.get('label')
        summary = cluster_summaries.get(cluster_label)
        if summary:
            cursor.execute(
                "UPDATE concepts SET summary = ? WHERE id = ?",
                (summary, cluster['id'])
            )
            print(f"   ✅ Cluster '{cluster_label}': {summary[:60]}...")
    
    # 3. Refinement summaries
    refinement_summaries = summaries.get("refinement_summaries", {})
    for refinement in refinements:
        refinement_label = refinement.get('label')
        summary = refinement_summaries.get(refinement_label)
        if summary:
            cursor.execute(
                "UPDATE concepts SET summary = ? WHERE id = ?",
                (summary, refinement['id'])
            )
            print(f"   ✅ Refinement '{refinement_label}': {summary[:60]}...")
    
    db_conn.commit()
    
    print(f"\n✅ Unified summarization complete for document {doc_id}", flush=True)
    print(f"   - 1 document summary")
    print(f"   - {len(cluster_summaries)} cluster summaries")
    print(f"   - {len(refinement_summaries)} refinement summaries")
    
    return {
        "document_summary": doc_summary,
        "cluster_count": len(clusters),
        "refinement_count": len(refinements),
        "summaries_generated": len(cluster_summaries) + len(refinement_summaries) + (1 if doc_summary else 0)
    }

