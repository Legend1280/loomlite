# Loom Lite - Current Task List

**Last Updated:** 2025-10-24  
**Status:** Testing Phase - MVP Completion

---

## 🎯 Current Sprint Goal

**Complete MVP and validate end-to-end extraction pipeline**

---

## ✅ Completed Today (2025-10-24)

1. ✅ Fixed Railway deployment (syntax errors)
2. ✅ Updated to GPT-5 model
3. ✅ Deployed frontend to Vercel
4. ✅ Connected N8N webhook to Railway API
5. ✅ Added database auto-initialization
6. ✅ Updated extraction prompt to match Ontology Standard v1.1
7. ✅ Created extraction prompt specification document
8. ✅ Updated DEV_HANDOFF.md with Pydantic validation task

---

## 🔥 Immediate (Next 2 Hours)

### Task 1: Test Updated Extraction Prompt ⭐ CURRENT
**Priority:** CRITICAL  
**Effort:** 30 minutes  
**Owner:** Next developer

**Steps:**
1. Send Pillars Financial document to N8N webhook
2. Check job status for concepts_count > 0
3. If still 0, check Railway logs for GPT-5 response
4. Validate that GPT-5 is returning spans + mentions
5. Document what GPT-5 actually returns

**Success Criteria:**
- [ ] Job completes without errors
- [ ] `concepts_count > 0` (ideally 30-60 for business plan)
- [ ] `relations_count > 0` (ideally 20-40)
- [ ] Can view concepts in frontend

**Commands:**
```bash
# Send document
cd /home/ubuntu/upload
python3 send_pdf.py

# Wait 45 seconds
sleep 45

# Check results
curl -s https://loomlite-production.up.railway.app/api/jobs | python3 -m json.tool | head -50
```

---

### Task 2: Add Pydantic Validation (Lock & Key) 🔐
**Priority:** CRITICAL  
**Effort:** 1 hour  
**Owner:** Next developer  
**Depends on:** Task 1 (to see what GPT-5 actually returns)

**Why Now:**
- Currently errors are silently swallowed
- No way to know if GPT-5 returns bad schema
- Prevents debugging extraction issues
- Essential before production use

**Implementation:**
1. Create Pydantic models in `backend/extractor.py`:
   ```python
   from pydantic import BaseModel, Field, validator
   from typing import List, Literal
   
   class ExtractedSpan(BaseModel):
       start: int = Field(ge=0)
       end: int = Field(ge=0)
       text: str = Field(min_length=1)
   
   class ExtractedConcept(BaseModel):
       label: str = Field(min_length=1)
       type: Literal["Person", "Project", "Date", "Metric", 
                     "Technology", "Feature", "Process", "Topic", "Team"]
       confidence: float = Field(ge=0.0, le=1.0)
       aliases: List[str] = []
       tags: List[str] = []
   
   class ExtractedRelation(BaseModel):
       src: str
       rel: Literal["defines", "depends_on", "owns", "leads", "enables",
                    "supports", "contains", "measures", "precedes", "provides",
                    "uses", "develops", "occurs_on", "triggers", "displays",
                    "controls", "shows", "performs", "ensures", "powers", "produces"]
       dst: str
       confidence: float = Field(ge=0.0, le=1.0)
   
   class ExtractedMention(BaseModel):
       concept_label: str
       span_index: int = Field(ge=0)
       confidence: float = Field(ge=0.0, le=1.0)
   
   class ExtractionResult(BaseModel):
       spans: List[ExtractedSpan]
       concepts: List[ExtractedConcept]
       relations: List[ExtractedRelation]
       mentions: List[ExtractedMention] = []
   ```

2. Update `extract_ontology_from_text()` to validate:
   ```python
   from pydantic import ValidationError
   
   try:
       result = json.loads(response.choices[0].message.content)
       validated = ExtractionResult(**result)  # 🔐 VALIDATION HERE
       
       # Process validated data
       for concept in validated.concepts:
           # ... existing logic
   
   except ValidationError as e:
       print(f"⚠️ VALIDATION FAILED for chunk {i+1}: {e}")
       # Log to file for debugging
       with open("/tmp/validation_errors.log", "a") as f:
           f.write(f"{datetime.now()}: {e}\n")
       continue  # Skip bad chunk
   ```

3. Add validation stats to return value:
   ```python
   return {
       "concepts": list(all_concepts.values()),
       "relations": all_relations,
       "spans": all_spans,
       "stats": {
           "total_chunks": len(chunks),
           "successful_chunks": successful_count,
           "failed_chunks": failed_count,
           "validation_errors": error_count
       }
   }
   ```

**Success Criteria:**
- [ ] Pydantic models defined
- [ ] Validation runs on each chunk
- [ ] Validation errors are logged (not silently swallowed)
- [ ] Stats returned with extraction result
- [ ] Test with Pillars Financial document
- [ ] No crashes, clear error messages if validation fails

---

### Task 3: Validate Character Offsets
**Priority:** HIGH  
**Effort:** 20 minutes  
**Owner:** Next developer  
**Depends on:** Task 1

**Steps:**
1. Query a completed extraction from database
2. Get a span's start/end offsets
3. Extract that substring from original document
4. Compare with span's stored text
5. Calculate accuracy rate

**Commands:**
```bash
# Get document ID from successful job
DOC_ID="doc_xxx"

# Query spans
curl -s "https://loomlite-production.up.railway.app/doc/$DOC_ID/ontology" | python3 -m json.tool

# Manually verify a few spans match the source text
```

**Success Criteria:**
- [ ] At least 90% of spans have accurate offsets
- [ ] Span text matches extracted substring
- [ ] Document any systematic errors

---

## 📅 Short-term (This Week)

### Task 4: Complete End-to-End Test
**Priority:** HIGH  
**Effort:** 1 hour  
**Owner:** Next developer

**Steps:**
1. Ingest Pillars Financial Business Plan
2. Wait for extraction to complete
3. Query `/api/jobs` to verify completion
4. Open Vercel frontend
5. Search for extracted concepts (e.g., "Pillars Financial")
6. Verify concepts appear in UI
7. Click on a concept to see relationships
8. Document the full user journey

**Success Criteria:**
- [ ] Document ingests successfully
- [ ] Concepts extracted (>30)
- [ ] Relations created (>20)
- [ ] Concepts visible in frontend
- [ ] Search works
- [ ] Relationships display correctly
- [ ] Screenshots of working system

---

### Task 5: Performance Benchmarks
**Priority:** MEDIUM  
**Effort:** 2 hours  
**Owner:** Next developer

**Test Documents:**
1. Short text (< 500 words)
2. Medium document (1-2 pages)
3. Long document (5-10 pages)
4. Very long document (20+ pages)
5. Technical document (code, APIs)
6. Business document (reports, plans)
7. Mixed content (tables, lists, prose)

**Metrics to Measure:**
- Extraction time per document
- Concepts extracted per page
- Relations extracted per page
- Character offset accuracy
- GPT-5 API cost per document
- Database size growth

**Success Criteria:**
- [ ] Tested with 10+ diverse documents
- [ ] Metrics documented in spreadsheet
- [ ] Identified performance bottlenecks
- [ ] Recommendations for optimization

---

### Task 6: Audit Extraction Prompt
**Priority:** MEDIUM  
**Effort:** 1 hour  
**Owner:** Domain expert / Technical lead

**Review Checklist:**
- [ ] Prompt matches Ontology Standard v1.1
- [ ] Example is accurate and helpful
- [ ] Instructions are clear and unambiguous
- [ ] Concept types are appropriate
- [ ] Relation verbs are sufficient
- [ ] Character offset instructions are correct
- [ ] Tested with sample documents
- [ ] Quality meets expectations

**Deliverable:**
- Completed audit checklist in `EXTRACTION_PROMPT_SPEC.md`
- Approval sign-off or revision requests

---

## 🔮 Medium-term (Next Week)

### Task 7: Fix N8N Workflow
**Priority:** MEDIUM  
**Effort:** 30 minutes

**Current Issue:**
- Workflow exists but not properly saved
- Missing webhook trigger node

**Steps:**
1. Open N8N workflow editor
2. Re-create webhook node (POST /loom-lite-ingest)
3. Re-create HTTP Request node
4. Configure JSON body properly
5. Save and activate
6. Test with curl

---

### Task 8: Add Monitoring & Logging
**Priority:** MEDIUM  
**Effort:** 2 hours

**What to Monitor:**
- Extraction success/failure rate
- Average extraction time
- GPT-5 API errors
- Database growth rate
- Validation error rate

**Tools:**
- Railway built-in logging
- Custom metrics endpoint
- Optional: Sentry for error tracking

---

### Task 9: Improve Error Handling
**Priority:** MEDIUM  
**Effort:** 2 hours

**Areas:**
- Graceful API failures
- User-friendly error messages
- Retry logic for transient failures
- Better logging for debugging

---

## 📊 Success Metrics

### MVP Complete When:
- [x] Backend deployed and stable
- [x] Frontend deployed and accessible
- [x] Database initialized
- [x] Extraction prompt updated
- [ ] **At least 1 document successfully extracted with concepts > 0**
- [ ] **Concepts visible in frontend**
- [ ] **End-to-end test passes**
- [ ] **Pydantic validation implemented**
- [ ] **Extraction prompt audited and approved**

### Production Ready When:
- [ ] All MVP criteria met
- [ ] Tested with 10+ diverse documents
- [ ] Performance benchmarks documented
- [ ] Monitoring and logging in place
- [ ] Error handling robust
- [ ] Documentation complete
- [ ] Security review passed

---

## 🚨 Known Blockers

### Blocker 1: 0 Concepts Extracted
**Status:** INVESTIGATING  
**Possible Causes:**
1. Database not initialized (FIXED 2025-10-24)
2. GPT-5 not returning expected schema (TESTING NOW)
3. Extraction prompt not working (UPDATED 2025-10-24)
4. Storage logic has bug (TO INVESTIGATE)

**Next Steps:**
- Test with updated prompt (Task 1)
- Check Railway logs for GPT-5 response
- Add Pydantic validation to catch schema errors (Task 2)

---

## 📝 Notes for Next Developer

### What's Working
- ✅ N8N webhook receives requests
- ✅ Railway API processes jobs
- ✅ Jobs complete (status: "completed")
- ✅ Database schema exists
- ✅ Frontend displays sample data

### What's NOT Working
- ❌ Concepts not being extracted (concepts_count = 0)
- ❌ Need to validate GPT-5 is returning correct schema
- ❌ No validation on extraction results

### Key Files to Review
- `backend/extractor.py` - Extraction logic and prompt
- `backend/api.py` - API endpoints and job processing
- `EXTRACTION_PROMPT_SPEC.md` - Prompt documentation
- `ONTOLOGY_STANDARD_v1.1.md` - Data model specification
- `DEV_HANDOFF.md` - Complete system documentation

### Quick Commands
```bash
# Test ingestion
cd /home/ubuntu/upload && python3 send_pdf.py

# Check jobs
curl -s https://loomlite-production.up.railway.app/api/jobs | python3 -m json.tool

# View frontend
# https://loomlite-ceiwo6txb-bradys-projects-179e6527.vercel.app

# Check Railway logs
# https://railway.app (login required)
```

---

**Last Updated:** 2025-10-24 00:35 UTC  
**Next Review:** After Task 1 completion

