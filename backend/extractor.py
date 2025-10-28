"""
LLM-powered Ontology Extractor
Uses OpenAI API to extract concepts and relations from documents
"""

import os
import json
import sqlite3
from typing import Dict, List, Tuple
from datetime import datetime
import hashlib
from openai import OpenAI

from reader import read_document, chunk_text
from semantic_cluster import build_semantic_hierarchy
from summarizer import summarize_document_hierarchy
from models import Concept, Relation, MicroOntology, DocumentMetadata, OntologyVersion

# Initialize OpenAI client (API key from environment)
client = OpenAI()

# Use same DB path as api.py for consistency
DB_DIR = os.getenv("DB_DIR", "/data")
DB_PATH = os.path.join(DB_DIR, "loom_lite_v2.db")

EXTRACTION_PROMPT = """You are an expert ontology extractor following the Loom Lite Ontology Standard v1.1.

Extract a structured micro-ontology from the text below. You MUST return a JSON object with this exact structure:

{
  "spans": [
    {
      "start": <character_offset_int>,
      "end": <character_offset_int>,
      "text": "exact quoted text from document"
    }
  ],
  "concepts": [
    {
      "label": "Concept Name",
      "type": "Person|Project|Date|Metric|Technology|Feature|Process|Topic|Team",
      "confidence": 0.0-1.0,
      "aliases": ["Alternative Name"],
      "tags": ["category", "domain"]
    }
  ],
  "relations": [
    {
      "src": "Source Concept Label",
      "rel": "defines|depends_on|owns|leads|enables|supports|contains|measures|precedes|provides|uses|develops|occurs_on|triggers|displays|controls|shows|performs|ensures|powers|produces",
      "dst": "Destination Concept Label",
      "confidence": 0.0-1.0
    }
  ],
  "mentions": [
    {
      "concept_label": "Concept Name",
      "span_index": <index_in_spans_array>,
      "confidence": 0.0-1.0
    }
  ]
}

**CRITICAL REQUIREMENTS:**

1. **Spans (Provenance)**
   - Extract 15-30 key text spans that contain important information
   - Use EXACT character offsets (count from start of text)
   - Include the exact quoted text
   - Each span should be 10-100 characters

2. **Concepts (Entities)**
   - Extract 10-20 key concepts per chunk
   - Types: Person (people), Project (initiatives), Date (time), Metric (numbers/KPIs), Technology (tools/systems), Feature (capabilities), Process (workflows), Topic (subjects), Team (groups)
   - Confidence: 1.0 = explicitly stated, 0.7 = clearly implied, 0.5 = inferred
   - Include aliases (alternative names/abbreviations)
   - Add domain-relevant tags

3. **Relations (Connections)**
   - Create 5-15 meaningful relationships between concepts
   - Use ONLY the allowed verbs listed above
   - Both src and dst must be concept labels from the concepts array
   - Confidence based on how explicit the relationship is

4. **Mentions (Evidence)**
   - Link each concept to 1-3 spans where it appears
   - span_index refers to position in spans array (0-indexed)
   - This provides provenance for each concept

**Example:**
If text says "Brady Simmons founded Loom Lite in Q4 2024", extract:
- Span: {start: 0, end: 45, text: "Brady Simmons founded Loom Lite in Q4 2024"}
- Concepts: [{label: "Brady Simmons", type: "Person"}, {label: "Loom Lite", type: "Project"}, {label: "Q4 2024", type: "Date"}]
- Relations: [{src: "Brady Simmons", rel: "owns", dst: "Loom Lite"}]
- Mentions: [{concept_label: "Brady Simmons", span_index: 0, confidence: 1.0}, ...]

**Text to analyze:**
"""


def extract_ontology_from_text(text: str, doc_id: str, model: str = "gpt-4.1") -> Dict:
    """
    Extract concepts and relations from text using OpenAI API
    
    Returns:
        {
            "concepts": [...],
            "relations": [...],
            "spans": [...]
        }
    """
    
    # Chunk text for processing
    chunks = chunk_text(text, chunk_size=1500, overlap=200)
    
    all_concepts = {}  # label -> concept
    all_relations = []
    all_spans = []
    
    print(f"Processing {len(chunks)} chunks...")
    
    for i, (start, end, chunk) in enumerate(chunks):
        print(f"  Chunk {i+1}/{len(chunks)}: [{start}:{end}]")
        
        try:
            # Call OpenAI API
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an expert ontology extractor."},
                    {"role": "user", "content": EXTRACTION_PROMPT + "\n\n" + chunk}
                ],
                temperature=0.0,
                response_format={"type": "json_object"}
            )
            
            # Parse response
            result = json.loads(response.choices[0].message.content)
            
            # DEBUG: Log what GPT-4.1 returned
            print(f"    GPT-4.1 returned: {len(result.get('concepts', []))} concepts, {len(result.get('relations', []))} relations, {len(result.get('spans', []))} spans")
            if len(result.get('concepts', [])) == 0:
                print(f"    WARNING: No concepts extracted! Full response: {json.dumps(result, indent=2)[:500]}")
            
            # Process concepts
            for concept in result.get("concepts", []):
                label = concept["label"]
                
                # Merge with existing concept if already seen
                if label in all_concepts:
                    # Update confidence (take max)
                    all_concepts[label]["confidence"] = max(
                        all_concepts[label]["confidence"],
                        concept["confidence"]
                    )
                    # Merge aliases
                    existing_aliases = set(all_concepts[label].get("aliases", []))
                    new_aliases = set(concept.get("aliases", []))
                    all_concepts[label]["aliases"] = list(existing_aliases | new_aliases)
                    # Merge tags
                    existing_tags = set(all_concepts[label].get("tags", []))
                    new_tags = set(concept.get("tags", []))
                    all_concepts[label]["tags"] = list(existing_tags | new_tags)
                else:
                    all_concepts[label] = concept
                
                # Create span for this concept mention
                # Find first occurrence in chunk
                mention_start = chunk.lower().find(label.lower())
                if mention_start >= 0:
                    mention_end = mention_start + len(label)
                    span = {
                        "start": start + mention_start,
                        "end": start + mention_end,
                        "text": chunk[mention_start:mention_end],
                        "concept_label": label
                    }
                    all_spans.append(span)
            
            # Process relations
            for relation in result.get("relations", []):
                # Only add if both concepts exist
                if relation["src"] in all_concepts and relation["dst"] in all_concepts:
                    all_relations.append(relation)
        
        except Exception as e:
            print(f"    ERROR processing chunk: {e}")
            import traceback
            traceback.print_exc()
            continue
    
    # Build semantic hierarchy (v2.3)
    raw_ontology = {
        "concepts": list(all_concepts.values()),
        "relations": all_relations,
        "spans": all_spans,
        "full_text": text  # Include full text for Surface Viewer
    }
    
    # Apply semantic clustering
    try:
        print("\n🔄 Building semantic hierarchy...")
        start_time = datetime.now()
        
        # Convert to Pydantic models for clustering
        concept_models = [
            Concept(
                concept_id=f"c_{doc_id}_{i}",
                doc_id=doc_id,
                label=c["label"],
                type=c["type"],
                confidence=c.get("confidence", 1.0),
                aliases=c.get("aliases"),
                tags=c.get("tags")
            )
            for i, c in enumerate(raw_ontology["concepts"])
        ]
        
        relation_models = [
            Relation(
                relation_id=f"r_{doc_id}_{i}",
                doc_id=doc_id,
                src=f"c_{doc_id}_{next((j for j, c in enumerate(raw_ontology['concepts']) if c['label'] == r['src']), 0)}",
                rel=r["rel"],
                dst=f"c_{doc_id}_{next((j for j, c in enumerate(raw_ontology['concepts']) if c['label'] == r['dst']), 0)}",
                confidence=r.get("confidence", 1.0)
            )
            for i, r in enumerate(raw_ontology["relations"])
        ]
        
        # Create minimal MicroOntology for clustering
        micro_ontology = MicroOntology(
            doc=DocumentMetadata(
                doc_id=doc_id,
                title="Processing",
                created_at=datetime.utcnow().isoformat() + "Z",
                updated_at=datetime.utcnow().isoformat() + "Z"
            ),
            version=OntologyVersion(
                ontology_version_id=f"ver_{doc_id}_temp",
                model={"name": "gpt-4.1", "version": "2025-10-22"},
                extracted_at=datetime.utcnow().isoformat() + "Z",
                pipeline="ingest+extract@v0.3.0"
            ),
            spans=[],
            concepts=concept_models,
            relations=relation_models,
            mentions={}
        )
        
        # Apply hierarchy
        hierarchical_ontology = build_semantic_hierarchy(micro_ontology)
        
        # Convert back to dict format
        hierarchical_concepts = [
            {
                "label": c.label,
                "type": c.type,
                "confidence": c.confidence,
                "aliases": c.aliases or [],
                "tags": c.tags or [],
                "parent_cluster_id": c.parent_cluster_id,
                "parent_concept_id": c.parent_concept_id,
                "hierarchy_level": c.hierarchy_level,
                "coherence": c.coherence,
                "temp_id": c.concept_id  # Store original ID for remapping
            }
            for c in hierarchical_ontology.concepts
        ]
        
        elapsed = (datetime.now() - start_time).total_seconds() * 1000
        
        # Count clusters
        cluster_count = len([c for c in hierarchical_ontology.concepts if c.hierarchy_level == 2])
        concept_count = len([c for c in hierarchical_ontology.concepts if c.hierarchy_level == 3])
        mean_coherence = sum([c.coherence or 0 for c in hierarchical_ontology.concepts if c.coherence]) / max(len(hierarchical_ontology.concepts), 1)
        
        print(f"✅ Hierarchy Built: {cluster_count} clusters, {concept_count} concepts")
        print(f"   Average Coherence: {mean_coherence:.2f}")
        print(f"   Processing Time: {elapsed:.0f}ms")
        
        if elapsed > 400:
            print(f"   ⚠️  WARNING: Clustering exceeded 400ms target")
        
        return {
            "concepts": hierarchical_concepts,
            "relations": raw_ontology["relations"],
            "spans": raw_ontology["spans"],
            "full_text": text
        }
        
    except Exception as e:
        print(f"⚠️  Clustering failed, falling back to flat structure: {e}")
        import traceback
        traceback.print_exc()
        return raw_ontology


def store_ontology(doc_id: str, title: str, source_uri: str, mime: str, 
                   checksum: str, file_bytes: int, ontology: Dict) -> str:
    """
    Store extracted ontology in database
    
    Returns:
        ontology_version_id
    """
    
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Insert document (with full text for Surface Viewer)
    cur.execute("""
        INSERT OR REPLACE INTO documents (id, title, source_uri, mime, checksum, bytes, text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, title, source_uri, mime, checksum, file_bytes,
          ontology.get("full_text", ""),  # Store full document text
          datetime.utcnow().isoformat() + "Z",
          datetime.utcnow().isoformat() + "Z"))
    
    # Insert ontology version
    version_id = f"ver_{doc_id}_{int(datetime.utcnow().timestamp())}"
    cur.execute("""
        INSERT INTO ontology_versions (id, doc_id, model_name, model_version, pipeline, extracted_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (version_id, doc_id, "gpt-4.1", "2025-10-22", "ingest+extract@v0.3.0", datetime.utcnow().isoformat() + "Z", "OpenAI extraction"))
    
    # Insert spans
    span_map = {}  # concept_label -> [span_ids]
    for i, span in enumerate(ontology["spans"]):
        span_id = f"s_{doc_id}_{i}"
        cur.execute("""
            INSERT INTO spans (id, doc_id, start, "end", text, extractor, quality)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (span_id, doc_id, span["start"], span["end"], span["text"], "openai@gpt-4.1", 0.9))
        
        concept_label = span["concept_label"]
        if concept_label not in span_map:
            span_map[concept_label] = []
        span_map[concept_label].append(span_id)
    
    # Insert concepts
    concept_map = {}  # label -> concept_id
    temp_id_map = {}  # temporary_id (cluster_xxx) -> final_id (c_xxx)
    
    for i, concept in enumerate(ontology["concepts"]):
        concept_id = f"c_{doc_id}_{i}"
        concept_map[concept["label"]] = concept_id
        
        # Map temporary cluster/refinement IDs to final database IDs
        if "temp_id" in concept:
            temp_id_map[concept["temp_id"]] = concept_id
        
        # Store hierarchy fields (v2.3)
        parent_cluster_id = concept.get("parent_cluster_id")
        parent_concept_id = concept.get("parent_concept_id")  # NEW: Intra-cluster hierarchy
        hierarchy_level = concept.get("hierarchy_level")
        coherence = concept.get("coherence")
        
        # Remap parent IDs if they're temporary cluster/refinement IDs
        if parent_cluster_id and parent_cluster_id in temp_id_map:
            parent_cluster_id = temp_id_map[parent_cluster_id]
        if parent_concept_id and parent_concept_id in temp_id_map:
            parent_concept_id = temp_id_map[parent_concept_id]
        
        cur.execute("""
            INSERT INTO concepts (id, doc_id, label, type, confidence, aliases, tags, model_name, prompt_ver, parent_cluster_id, parent_concept_id, hierarchy_level, coherence)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (concept_id, doc_id, concept["label"], concept["type"], concept["confidence"],
              json.dumps(concept.get("aliases", [])),
              json.dumps(concept.get("tags", [])),
              "gpt-4.1", "v1.0",
              parent_cluster_id, parent_concept_id, hierarchy_level, coherence))
    
    # Insert relations
    for i, relation in enumerate(ontology["relations"]):
        relation_id = f"r_{doc_id}_{i}"
        src_id = concept_map.get(relation["src"])
        dst_id = concept_map.get(relation["dst"])
        
        if src_id and dst_id:
            cur.execute("""
                INSERT INTO relations (id, doc_id, src, rel, dst, confidence, model_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (relation_id, doc_id, src_id, relation["rel"], dst_id,
                  relation["confidence"], "gpt-4.1"))
    
    # Insert mentions
    mention_id = 0
    for concept_label, span_ids in span_map.items():
        concept_id = concept_map.get(concept_label)
        if concept_id:
            for span_id in span_ids:
                cur.execute("""
                    INSERT INTO mentions (id, concept_id, doc_id, span_id, confidence)
                    VALUES (?, ?, ?, ?, ?)
                """, (f"m_{doc_id}_{mention_id}", concept_id, doc_id, span_id, 0.85))
                mention_id += 1
    
    conn.commit()
    conn.close()
    
    print(f"✅ Stored ontology: {len(ontology['concepts'])} concepts, {len(ontology['relations'])} relations")
    
    return version_id


def extract_and_store(file_path: str, title: str = None) -> Tuple[str, Dict]:
    """
    Complete extraction pipeline: read file → extract ontology → store in DB
    
    Returns:
        (doc_id, stats)
    """
    
    # Read document
    print(f"📄 Reading document: {file_path}")
    doc_data = read_document(file_path)
    
    # Generate doc_id from checksum
    doc_id = f"doc_{hashlib.sha256(doc_data['checksum'].encode()).hexdigest()[:12]}"
    
    if not title:
        title = os.path.basename(file_path)
    
    # Extract ontology
    print(f"🧠 Extracting ontology...")
    ontology = extract_ontology_from_text(doc_data["text"], doc_id)
    
    # Store in database
    print(f"💾 Storing in database...")
    version_id = store_ontology(
        doc_id=doc_id,
        title=title,
        source_uri=f"file://{os.path.abspath(file_path)}",
        mime=doc_data["mime"],
        checksum=doc_data["checksum"],
        file_bytes=doc_data["bytes"],
        ontology=ontology
    )
    
    # Generate summaries for document hierarchy
    print(f"📝 Generating summaries...")
    try:
        conn = sqlite3.connect(DB_PATH)
        summary_stats = summarize_document_hierarchy(
            doc_id=doc_id,
            doc_text=doc_data["text"],
            doc_title=title,
            concepts=ontology["concepts"],
            relations=ontology["relations"],
            db_conn=conn
        )
        conn.close()
    except Exception as e:
        print(f"⚠️  Summarization failed: {e}")
        import traceback
        traceback.print_exc()
        summary_stats = {}
    
    stats = {
        "doc_id": doc_id,
        "version_id": version_id,
        "concepts": len(ontology["concepts"]),
        "relations": len(ontology["relations"]),
        "spans": len(ontology["spans"]),
        "summaries": summary_stats
    }
    
    print(f"✅ Extraction complete!")
    print(f"   Doc ID: {doc_id}")
    print(f"   Concepts: {stats['concepts']}")
    print(f"   Relations: {stats['relations']}")
    print(f"   Spans: {stats['spans']}")
    
    return doc_id, stats


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python extractor.py <file_path> [title]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    title = sys.argv[2] if len(sys.argv) > 2 else None
    
    try:
        doc_id, stats = extract_and_store(file_path, title)
        print(f"\n✅ Success! Document ID: {doc_id}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

