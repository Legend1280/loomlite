# Semantic Search Integration - Test Checklist
**Version:** 1.0  
**Date:** October 27, 2025  
**Status:** Ready for Testing  

---

## Test Environment

**Frontend**: https://loomlite.vercel.app  
**Backend**: http://127.0.0.1:8000  
**Local Commits**: Ready (need manual push due to auth expiry)

---

## Pre-Test Verification

### Backend Deployment
- [ ] Verify Railway has deployed commit `c3840b4` (enhanced /search endpoint)
- [ ] Test `/search?q=test` endpoint returns new format with `document_scores`
- [ ] Verify response includes `threshold: 0.25`

### Frontend Deployment  
- [ ] Verify Vercel has deployed commit `21a0051` (frontend integration)
- [ ] Check browser console for no JavaScript errors
- [ ] Verify all modules load successfully

---

## Functional Tests

### 1. Search Input Behavior

**Test 1.1: Basic Search**
- [ ] Type "Pillars" in search bar
- [ ] Verify autocomplete dropdown shows matching concepts
- [ ] Verify search debounce (200ms delay)
- [ ] Check console shows "Filtering X documents in Galaxy View (v1.6)"

**Test 1.2: Search Cleared**
- [ ] Clear search input (backspace all text)
- [ ] Verify `searchCleared` event is emitted
- [ ] Check console shows "Resetting X View search filter" for each view
- [ ] Verify all views return to normal opacity

**Test 1.3: Empty Query**
- [ ] Submit empty search query
- [ ] Verify backend returns empty results
- [ ] Verify no filtering occurs

---

## View-Specific Tests

### 2. Galaxy View Filtering

**Test 2.1: Document Fade**
- [ ] Search for a term that matches 2-3 documents
- [ ] Verify matching documents remain at `opacity: 1.0`
- [ ] Verify non-matching documents fade to `opacity: 0.05`
- [ ] Verify transition is smooth (400ms)

**Test 2.2: Clear Search**
- [ ] Clear search input
- [ ] Verify all documents return to `opacity: 1.0`
- [ ] Verify transition is smooth (400ms)

**Test 2.3: No Matches**
- [ ] Search for "xyz123" (non-existent term)
- [ ] Verify all documents fade to `opacity: 0.05`

---

### 3. Solar System View Filtering

**Test 3.1: Concept Fade**
- [ ] Open a document in Solar System view
- [ ] Search for a concept that exists in the document
- [ ] Verify matching concept nodes remain at `opacity: 1.0`
- [ ] Verify non-matching nodes fade to `opacity: 0.1`
- [ ] Verify links connected to matching concepts show `opacity: 0.6`
- [ ] Verify links not connected to matches fade to `opacity: 0.05`

**Test 3.2: Clear Search**
- [ ] Clear search input
- [ ] Verify all nodes return to `opacity: 1.0`
- [ ] Verify all links return to `opacity: 0.6`

**Test 3.3: No Matches in Document**
- [ ] Search for a term that doesn't exist in current document
- [ ] Verify all nodes fade to `opacity: 0.1`
- [ ] Verify all links fade to `opacity: 0.05`

---

### 4. Planet View Filtering

**Test 4.1: Node Fade**
- [ ] Open a document in Planet View
- [ ] Search for a concept
- [ ] Verify matching nodes remain at `opacity: 1.0`
- [ ] Verify non-matching nodes fade to `opacity: 0.2`
- [ ] Verify document/category nodes remain at `opacity: 1.0`

**Test 4.2: Auto-Expand**
- [ ] Search for a concept that's in a collapsed branch
- [ ] Verify the branch auto-expands to show the match
- [ ] Verify the path to the matched node is expanded

**Test 4.3: Clear Search**
- [ ] Clear search input
- [ ] Verify all nodes return to `opacity: 1.0`
- [ ] Verify stroke colors reset to default

---

## Integration Tests

### 5. Cross-View Synchronization

**Test 5.1: Galaxy → Solar**
- [ ] Search in Galaxy View
- [ ] Click a matching document
- [ ] Verify Solar System view loads
- [ ] Verify search filter persists in Solar System

**Test 5.2: Galaxy → Planet**
- [ ] Search in Galaxy View
- [ ] Click a matching document
- [ ] Switch to Planet View
- [ ] Verify search filter persists in Planet View

**Test 5.3: Event Bus**
- [ ] Open browser console
- [ ] Search for "test"
- [ ] Verify `searchResults` event is logged
- [ ] Clear search
- [ ] Verify `searchCleared` event is logged

---

## Performance Tests

### 6. Performance Validation

**Test 6.1: Search Latency**
- [ ] Type a search query
- [ ] Check console for search completion time
- [ ] Verify search completes in < 200ms (target)
- [ ] Note: Warning logged if > 150ms

**Test 6.2: Transition Smoothness**
- [ ] Search and clear multiple times
- [ ] Verify all transitions are smooth (400ms)
- [ ] Verify no visual glitches or jumps

**Test 6.3: Large Dataset**
- [ ] Test with 10+ documents
- [ ] Verify Galaxy View handles filtering smoothly
- [ ] Verify no performance degradation

---

## Edge Cases

### 7. Edge Case Testing

**Test 7.1: Special Characters**
- [ ] Search for terms with special characters (e.g., "C++", "AI/ML")
- [ ] Verify search handles them correctly

**Test 7.2: Partial Matches**
- [ ] Search for "Pil" (partial of "Pillars")
- [ ] Verify fuzzy matching works (if implemented)

**Test 7.3: Case Sensitivity**
- [ ] Search for "pillars" (lowercase)
- [ ] Verify case-insensitive matching works

**Test 7.4: Multiple Words**
- [ ] Search for "Revenue Analysis"
- [ ] Verify multi-word search works

---

## Regression Tests

### 8. Existing Functionality

**Test 8.1: Document Upload**
- [ ] Upload a new document
- [ ] Verify it appears in Galaxy View
- [ ] Search for concepts from the new document
- [ ] Verify filtering works

**Test 8.2: Focus Mode**
- [ ] Double-click a panel to enter focus mode
- [ ] Perform a search
- [ ] Verify filtering works in focus mode
- [ ] Exit focus mode
- [ ] Verify filtering persists

**Test 8.3: Triple-Click Centering**
- [ ] Search to filter nodes
- [ ] Triple-click to center view
- [ ] Verify centering works with filtered nodes

---

## Browser Compatibility

### 9. Cross-Browser Testing

**Test 9.1: Chrome**
- [ ] Test all features in Chrome 120+
- [ ] Verify no console errors

**Test 9.2: Firefox**
- [ ] Test all features in Firefox 121+
- [ ] Verify no console errors

**Test 9.3: Safari**
- [ ] Test all features in Safari 17+
- [ ] Verify no console errors

---

## Known Issues / Notes

### Issues to Watch For
- **GitHub Auth**: Manual push required (auth expired)
- **Railway Deployment**: Verify backend redeploys automatically
- **Vercel Deployment**: Verify frontend redeploys automatically

### Expected Behavior
- Search is **case-insensitive**
- Threshold is **0.25** (documents below this are filtered out)
- Transitions are **400ms** for all views
- Empty search shows **all documents**

---

## Test Results

**Tester**: _________________  
**Date**: _________________  
**Environment**: Production / Staging / Local  

**Overall Status**: ⬜ Pass  ⬜ Fail  ⬜ Partial  

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Sign-Off

**Developer**: Manus AI  
**Reviewer**: _________________  
**Date**: _________________  

---

*This checklist ensures comprehensive testing of the semantic search integration across all LoomLite v4.0 views.*

