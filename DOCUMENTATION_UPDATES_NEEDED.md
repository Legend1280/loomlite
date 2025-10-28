# Documentation Updates Needed

## Semantic Folders Fix - Session 2025-10-27

### Files That Need Documentation Updates:

#### 1. **ONTOLOGY_STANDARD_v1.6.md**
**Section**: API Endpoints
**Updates Needed**:
- Add `/api/folders/semantic` endpoint specification
- Document unified folder response format
- Add search filtering behavior for Dynamic Navigator

#### 2. **DYNAMIC_NAVIGATOR_IMPLEMENTATION_PLAN.md**
**Section**: Backend Endpoints
**Updates Needed**:
- Update endpoint list to include `/api/folders/semantic`
- Document the consolidated semantic folder approach
- Add search integration specifications

#### 3. **SEMANTIC_SEARCH_IMPLEMENTATION_SUMMARY.md**
**Section**: Frontend Integration
**Updates Needed**:
- Add Dynamic Navigator to list of search-integrated views
- Document folder filtering behavior during search
- Add event flow diagram for navigator search

#### 4. **README.md** (if exists)
**Section**: Navigator Features
**Updates Needed**:
- Document three-mode system (Standard/Meaning/Time)
- Explain search filtering across all navigator modes
- Add troubleshooting section for "Loading folders..." issue

#### 5. **API Documentation** (to be created)
**New File**: `API_REFERENCE.md`
**Content Needed**:
- Complete API endpoint reference
- Request/response formats
- Error handling
- Rate limiting (if any)

---

## Implementation Checklist

### Backend Changes
- [ ] Create `/api/folders/semantic` endpoint
- [ ] Test endpoint returns correct format
- [ ] Update backend API documentation

### Frontend Changes  
- [ ] Update `navigatorDynamicPane.js` to use new endpoint
- [ ] Add search event listeners
- [ ] Improve loading/error states
- [ ] Test all three modes work correctly

### Documentation Updates
- [ ] Update ONTOLOGY_STANDARD_v1.6.md
- [ ] Update DYNAMIC_NAVIGATOR_IMPLEMENTATION_PLAN.md
- [ ] Update SEMANTIC_SEARCH_IMPLEMENTATION_SUMMARY.md
- [ ] Create API_REFERENCE.md (if needed)
- [ ] Update README.md (if exists)

---

## Notes
- All documentation updates should be completed AFTER implementation is verified working
- Include screenshots/examples where helpful
- Keep ontology-first principles in mind
- Document any breaking changes or migration steps

**Status**: 🔴 Pending Implementation
**Last Updated**: 2025-10-27

