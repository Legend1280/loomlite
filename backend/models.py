"""
Pydantic models for Loom Lite Ontology-First architecture
Based on MicroOntology specification
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


# ============================================================================
# Core Ontology Models
# ============================================================================

class DocumentMetadata(BaseModel):
    """Document metadata with provenance"""
    doc_id: str
    title: str
    source_uri: Optional[str] = None
    mime: Optional[str] = None
    checksum: Optional[str] = None
    bytes: Optional[int] = None
    created_at: str
    updated_at: str


class OntologyVersion(BaseModel):
    """Extraction pipeline version tracking"""
    ontology_version_id: str
    model: Dict[str, str]  # {"name": "gpt-4.x", "version": "2025-10-01"}
    extracted_at: str
    pipeline: str
    notes: Optional[str] = None


class Span(BaseModel):
    """Character-accurate evidence anchor"""
    span_id: str
    doc_id: str
    start: int
    end: int
    text: str
    page_hint: Optional[int] = None
    section: Optional[str] = None
    provenance: Optional[Dict[str, Any]] = None  # {"extractor": "...", "quality": 0.94}


class Concept(BaseModel):
    """Typed concept node with confidence"""
    concept_id: str
    doc_id: str
    label: str
    type: str  # Metric | Person | Project | Topic | Date | Technology | Feature | Process | Team
    confidence: float = 1.0
    aliases: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    provenance: Optional[Dict[str, str]] = None  # {"model": "...", "prompt_ver": "..."}
    # Semantic Hierarchy (v1.2)
    parent_cluster_id: Optional[str] = None  # Parent cluster concept_id
    parent_concept_id: Optional[str] = None  # Parent refinement concept_id (for intra-cluster hierarchy)
    hierarchy_level: Optional[int] = None  # 0=doc, 1=section, 2=cluster, 3=refinement, 4=concept
    coherence: Optional[float] = None  # Average relation confidence
    # Summarization (v2.4)
    summary: Optional[str] = None  # LLM-generated summary for clusters/refinements


class Relation(BaseModel):
    """Directed edge between concepts"""
    relation_id: str
    doc_id: str
    src: str  # source concept_id
    rel: str  # defines | depends_on | uses | supports | contains | measures | precedes | ...
    dst: str  # destination concept_id
    confidence: float = 1.0
    provenance: Optional[Dict[str, Any]] = None


class MentionLink(BaseModel):
    """Link from concept to span"""
    span_id: str
    confidence: float = 1.0


class VectorConfig(BaseModel):
    """Vector storage configuration"""
    concept_vectors: str = "external"  # external | inline
    span_vectors: str = "external"


class MicroOntology(BaseModel):
    """Complete micro-ontology for a single document"""
    doc: DocumentMetadata
    version: OntologyVersion
    spans: List[Span]
    concepts: List[Concept]
    relations: List[Relation]
    mentions: Dict[str, List[MentionLink]]  # concept_id -> [MentionLink]
    vectors: VectorConfig = Field(default_factory=lambda: VectorConfig())


# ============================================================================
# API Response Models
# ============================================================================

class SearchResult(BaseModel):
    """Search result with ranking"""
    concept_id: str
    doc_id: str
    label: str
    type: str
    score: float
    snippet: Optional[str] = None
    highlights: Optional[List[Dict[str, Any]]] = None


class JumpTarget(BaseModel):
    """Evidence location for jump-to-evidence"""
    doc_id: str
    concept_id: str
    span_id: str
    text: str
    start: int
    end: int
    page_hint: Optional[int] = None
    context: Optional[str] = None  # Surrounding text


class TreeNode(BaseModel):
    """Document tree node"""
    id: str
    type: str  # file | folder
    name: str
    parent: str
    mime: Optional[str] = None
    concept_count: Optional[int] = None
    tags: Optional[List[str]] = None


class FilterOption(BaseModel):
    """Filter chip option"""
    label: str
    type: str  # concept_type | tag | date_range
    count: int
    active: bool = False


# ============================================================================
# Ingest/Extract Models
# ============================================================================

class IngestRequest(BaseModel):
    """Document ingest request"""
    source_uri: str
    title: Optional[str] = None
    force_reextract: bool = False


class ExtractRequest(BaseModel):
    """Manual extraction request"""
    doc_id: str
    model: str = "gpt-4.1-mini"
    pipeline: str = "extract@v0.2.1"


class JobStatus(BaseModel):
    """Async job status"""
    job_id: str
    status: str  # pending | running | completed | failed
    doc_id: Optional[str] = None
    progress: float = 0.0
    error: Optional[str] = None
    created_at: str
    updated_at: str


# ============================================================================
# Helper Functions
# ============================================================================

def concept_to_dict(concept: Concept) -> Dict[str, Any]:
    """Convert Concept to dict for JSON serialization"""
    return concept.model_dump(exclude_none=True)


def micro_ontology_to_dict(ontology: MicroOntology) -> Dict[str, Any]:
    """Convert MicroOntology to dict for JSON serialization"""
    return ontology.model_dump(exclude_none=True)

