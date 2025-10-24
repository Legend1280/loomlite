# Loom Lite Extraction Prompt Specification

**Version:** 1.1.0  
**Last Updated:** 2025-10-24  
**Status:** ACTIVE - REQUIRES AUDIT  
**Compliance:** Ontology Standard v1.1

---

## 🔍 Audit Status

**⚠️ THIS PROMPT REQUIRES REVIEW**

- [ ] Reviewed by domain expert
- [ ] Tested with sample documents
- [ ] Validated against Ontology Standard v1.1
- [ ] Performance benchmarked
- [ ] Edge cases documented
- [ ] Approved for production use

**Reviewers:**
- [ ] Technical Lead: _____________
- [ ] Ontology Architect: _____________
- [ ] QA Engineer: _____________

---

## 1. Purpose & Scope

### 1.1 What This Prompt Does

This prompt instructs GPT-5 to extract structured micro-ontologies from unstructured text documents. It produces:

1. **Spans** - Character-level text excerpts (provenance)
2. **Concepts** - Named entities with types and metadata
3. **Relations** - Typed connections between concepts
4. **Mentions** - Links between concepts and their source spans

### 1.2 What This Prompt Does NOT Do

- Does NOT summarize or paraphrase content
- Does NOT generate new information beyond what's in the text
- Does NOT perform sentiment analysis or opinion extraction
- Does NOT translate or modify the source text

### 1.3 Compliance Requirements

This prompt MUST comply with:
- **Ontology Standard v1.1** (ONTOLOGY_STANDARD_v1.1.md)
- **Database Schema v2** (schema_v2.sql)
- **MicroOntology JSON Structure** (models.py)

---

## 2. Current Prompt Text

**Location:** `/backend/extractor.py` (lines 21-93)

**Model:** `gpt-5`  
**Temperature:** `1.0` (default - GPT-5 only supports this value)  
**Response Format:** `json_object` (structured output)

**Note:** GPT-5 does not support custom temperature values. Attempts to use `temperature=0.3` result in a 400 error: "Unsupported value: 'temperature' does not support 0.3 with this model. Only the default (1) value is supported."

### 2.1 Full Prompt

```
You are an expert ontology extractor following the Loom Lite Ontology Standard v1.1.

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
```

---

## 3. Prompt Design Rationale

### 3.1 Why This Structure?

**Explicit Schema Definition**
- Provides GPT-5 with exact JSON structure to follow
- Reduces hallucination and format errors
- Ensures compatibility with database schema

**Numbered Requirements**
- Clear, scannable instructions
- Easy to reference in debugging
- Hierarchical organization

**Concrete Example**
- Shows GPT-5 exactly what output looks like
- Demonstrates all four components working together
- Uses realistic domain example

**Quantitative Targets**
- "15-30 spans" - Prevents too few or too many extractions
- "10-20 concepts" - Balances coverage vs. noise
- "5-15 relations" - Ensures meaningful connections

### 3.2 Why These Constraints?

| Constraint | Reason |
|------------|--------|
| Character offsets (not line numbers) | Database stores character positions; enables precise text highlighting |
| Exact quoted text in spans | Validates offset accuracy; provides human-readable provenance |
| Fixed concept types | Maintains taxonomy consistency; enables type-based filtering |
| Fixed relation verbs | Prevents semantic drift; enables relationship querying |
| Confidence scores | Captures extraction uncertainty; enables quality filtering |
| Span length 10-100 chars | Too short = no context; too long = too much noise |

---

## 4. Known Issues & Limitations

### 4.1 Current Issues

**⚠️ UNVERIFIED - NEEDS TESTING**

1. **Character Offset Accuracy**
   - GPT-5 may struggle with exact character counting
   - Chunked text complicates offset calculation
   - **Risk:** Spans may not align with actual text positions

2. **Mention Linking**
   - GPT-5 must correctly index spans array
   - Off-by-one errors possible
   - **Risk:** Broken provenance links

3. **Concept Deduplication**
   - Same concept may appear in multiple chunks
   - Prompt doesn't specify how to handle duplicates
   - **Risk:** Redundant concepts in database

4. **Relation Validation**
   - GPT-5 may create relations between non-existent concepts
   - src/dst must match concept labels exactly
   - **Risk:** Orphaned relations

### 4.2 Edge Cases

**Empty Documents**
- What if text is too short (< 100 chars)?
- Should return empty arrays or error?

**Non-English Text**
- Prompt is in English; does it work for other languages?
- Concept types may not translate well

**Highly Technical Text**
- Medical, legal, scientific jargon
- May need domain-specific concept types

**Ambiguous References**
- "He", "it", "the company" - how to handle?
- Should GPT-5 resolve coreferences?

---

## 5. Validation & Testing

### 5.1 Test Cases

**Test 1: Simple Document**
```
Input: "Brady Simmons founded Loom Lite in Q4 2024."
Expected:
- 1 span
- 3 concepts (Person, Project, Date)
- 1 relation (owns)
- 3 mentions
```

**Test 2: Complex Business Plan**
```
Input: Pillars Financial Business Plan (8 pages)
Expected:
- 50-100 spans
- 30-60 concepts (mix of types)
- 20-40 relations
- 60-120 mentions
```

**Test 3: Edge Case - Very Short**
```
Input: "Hello world"
Expected:
- 0-1 spans
- 0 concepts
- 0 relations
- 0 mentions
```

### 5.2 Quality Metrics

**Precision**
- Are extracted concepts actually in the text?
- Are relations semantically correct?

**Recall**
- Are key concepts being missed?
- Are important relationships overlooked?

**Provenance Accuracy**
- Do character offsets match actual text?
- Are mentions correctly linked to spans?

**Consistency**
- Same document → same extraction (with temp=0.3)?
- Similar documents → similar concept types?

---

## 6. Prompt Evolution History

### Version 1.0 (Original)
- Basic concept + relation extraction
- No spans or mentions
- Incomplete schema
- **Issue:** No provenance, 0 concepts extracted

### Version 1.1 (Current - 2025-10-24)
- Added spans with character offsets
- Added mentions for provenance
- Aligned with Ontology Standard v1.1
- Explicit requirements and example
- **Status:** DEPLOYED, UNTESTED

### Version 1.2 (Proposed)
- Add few-shot examples (3-5 examples)
- Add explicit coreference resolution instructions
- Add validation rules (e.g., "src and dst must exist in concepts")
- Add error handling guidance

---

## 7. Audit Checklist

### 7.1 Technical Review

- [ ] Prompt matches Ontology Standard v1.1 exactly
- [ ] JSON schema is valid and complete
- [ ] All concept types are documented
- [ ] All relation verbs are documented
- [ ] Character offset logic is sound
- [ ] Mention linking is correctly specified
- [ ] Example is accurate and helpful

### 7.2 Performance Review

- [ ] Test with 10+ diverse documents
- [ ] Measure extraction time per document
- [ ] Validate character offset accuracy (>95%)
- [ ] Check concept precision (>90%)
- [ ] Check concept recall (>80%)
- [ ] Verify relation validity (>95%)
- [ ] Confirm mention linking works (>90%)

### 7.3 Security Review

- [ ] Prompt doesn't expose system internals
- [ ] No injection vulnerabilities
- [ ] No PII leakage in examples
- [ ] Safe for public documents
- [ ] Safe for confidential documents

### 7.4 Compliance Review

- [ ] Aligns with Ontology Standard v1.1
- [ ] Compatible with schema_v2.sql
- [ ] Matches MicroOntology structure
- [ ] Follows naming conventions
- [ ] Documented and versioned

---

## 8. Approval & Sign-Off

**Prompt Version:** 1.1.0  
**Reviewed Date:** _______________  
**Approved By:** _______________  
**Next Review Date:** _______________

**Approval Status:**
- [ ] ✅ APPROVED - Ready for production
- [ ] ⚠️ APPROVED WITH CONDITIONS - See notes below
- [ ] ❌ REJECTED - Requires revision

**Reviewer Notes:**
```
[Space for reviewer comments]
```

---

## 9. Maintenance & Updates

### 9.1 When to Update This Prompt

**MUST update if:**
- Ontology Standard version changes
- Database schema changes
- Concept types are added/removed
- Relation verbs are added/removed
- Extraction quality drops below threshold

**SHOULD update if:**
- Better examples are found
- Edge cases are discovered
- Performance can be improved
- User feedback suggests improvements

### 9.2 Update Process

1. Create new version of this document
2. Increment version number (1.1 → 1.2)
3. Document changes in "Prompt Evolution History"
4. Test new prompt with benchmark documents
5. Get approval from reviewers
6. Update `extractor.py`
7. Deploy to staging
8. Monitor extraction quality
9. Deploy to production
10. Archive old version

---

## 10. References

**Related Documents:**
- `ONTOLOGY_STANDARD_v1.1.md` - Canonical ontology specification
- `schema_v2.sql` - Database schema
- `models.py` - MicroOntology data models
- `extractor.py` - Extraction implementation
- `DEV_HANDOFF.md` - System documentation

**External Resources:**
- OpenAI GPT-5 Documentation
- JSON Schema Specification
- Ontology Engineering Best Practices

---

## Appendix A: Sample GPT-5 Output

**Input Text:**
```
Brady Simmons founded the Sovereign Foundation in October 2024. The foundation focuses on AI research.
```

**Expected GPT-5 Response:**
```json
{
  "spans": [
    {"start": 0, "end": 62, "text": "Brady Simmons founded the Sovereign Foundation in October 2024"},
    {"start": 64, "end": 108, "text": "The foundation focuses on AI research"}
  ],
  "concepts": [
    {"label": "Brady Simmons", "type": "Person", "confidence": 1.0, "aliases": [], "tags": ["founder"]},
    {"label": "Sovereign Foundation", "type": "Project", "confidence": 1.0, "aliases": ["the foundation"], "tags": ["organization"]},
    {"label": "October 2024", "type": "Date", "confidence": 1.0, "aliases": [], "tags": ["founding"]},
    {"label": "AI research", "type": "Topic", "confidence": 1.0, "aliases": [], "tags": ["focus-area"]}
  ],
  "relations": [
    {"src": "Brady Simmons", "rel": "owns", "dst": "Sovereign Foundation", "confidence": 1.0},
    {"src": "Sovereign Foundation", "rel": "occurs_on", "dst": "October 2024", "confidence": 1.0},
    {"src": "Sovereign Foundation", "rel": "enables", "dst": "AI research", "confidence": 0.9}
  ],
  "mentions": [
    {"concept_label": "Brady Simmons", "span_index": 0, "confidence": 1.0},
    {"concept_label": "Sovereign Foundation", "span_index": 0, "confidence": 1.0},
    {"concept_label": "Sovereign Foundation", "span_index": 1, "confidence": 0.9},
    {"concept_label": "October 2024", "span_index": 0, "confidence": 1.0},
    {"concept_label": "AI research", "span_index": 1, "confidence": 1.0}
  ]
}
```

---

**END OF SPECIFICATION**

