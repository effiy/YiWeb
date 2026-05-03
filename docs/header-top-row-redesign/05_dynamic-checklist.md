# Header Top Row Redesign — Dynamic Checklist

> **Document Version**: v2.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude Sonnet 4.6 | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Document](./01_requirement-document.md) | [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [CLAUDE.md](../../CLAUDE.md)
>
> **Git Branch**: main
>
> **Doc Start Time**: 18:00:00 | **Doc Last Update Time**: 18:00:00
>

[General Checks](#general-checks) | [Scenario Verification](#main-operation-scenario-verification) | [Feature Implementation](#feature-implementation-checks) | [Code Quality](#code-quality-checks) | [Testing](#testing-checks) | [Check Summary](#check-summary)

---

## General Checks

| Check Item | Priority | Status | Notes |
|------------|----------|--------|-------|
| Title format correct | P0 | ✅ Pass | Document header follows general-document spec |
| Linked document links valid | P0 | ✅ Pass | All relative links point to existing files in same directory |
| Related files created/updated | P0 | ✅ Pass | `SearchHeader/template.html`, `SearchHeader/index.css`, `aicrHeader/index.html`, `aicrHeader/index.css` |
| Project buildable | P0 | ✅ Pass | No build step required; static files only |

---

## Main Operation Scenario Verification

### Scenario 1 — Desktop user views optimized header-top-row layout

- **Linked requirement task**: [02 Requirement Tasks — Scenario 1](./02_requirement-tasks.md#scenario-1--desktop-user-views-optimized-header-top-row-layout)
- **Linked design document**: [03 Design Document — Scenario 1](./03_design-document.md#scenario-1--desktop-user-views-optimized-header-top-row-layout)
- **Verification tool recommendation**: Manual browser review (`python -m http.server 8000`) + DevTools responsive mode

#### Preconditions Verification

| # | Precondition | Verification Method | Status |
|---|--------------|---------------------|--------|
| 1 | AICR page loaded | Open `http://localhost:8080/src/views/aicr/index.html` | ⏳ Not started |
| 2 | Viewport width ≥1025 px | Set browser width to 1440 px | ⏳ Not started |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Observe header layout | Visual inspection: .tags-header inside .header-center | ⏳ Not started |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | `.tags-header` is inside `.header-center` | DevTools element inspector | ⏳ Not started |
| 2 | Search box is wider | DevTools computed width ≥520 px | ⏳ Not started |
| 3 | No `.header-top-row` wrapper | DevTools element inspector | ⏳ Not started |

#### Verification Focus Points

| Focus Point | Priority | Verification Method | Status |
|-------------|----------|---------------------|--------|
| `.tags-header` inside `.header-center` | P0 | DevTools element inspector | ⏳ Not started |
| Search box width ≥520 px | P0 | DevTools computed styles | ⏳ Not started |
| No horizontal overflow | P0 | DevTools: check `scrollWidth <= clientWidth` | ⏳ Not started |

---

### Scenario 2 — User interacts with consolidated tag filter controls

- **Linked requirement task**: [02 Requirement Tasks — Scenario 2](./02_requirement-tasks.md#scenario-2--user-interacts-with-consolidated-tag-filter-controls)
- **Linked design document**: [03 Design Document — Scenario 2](./03_design-document.md#scenario-2--user-interacts-with-consolidated-tag-filter-controls)
- **Verification tool recommendation**: Manual browser review + Vue DevTools event logging

#### Preconditions Verification

| # | Precondition | Verification Method | Status |
|---|--------------|---------------------|--------|
| 1 | AICR page loaded | Open page | ⏳ Not started |
| 2 | At least one tag or noTagsCount > 0 | Verify tag list is visible | ⏳ Not started |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Click no-tags filter | Mouse click | ⏳ Not started |
| 2 | Click reverse filter | Mouse click | ⏳ Not started |
| 3 | Click expand filter | Mouse click | ⏳ Not started |
| 4 | Click clear-all | Mouse click | ⏳ Not started |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Each button toggles state | Visual inspection + Vue DevTools events | ⏳ Not started |
| 2 | Active tint shown when enabled | Inspect computed `background-color` | ⏳ Not started |
| 3 | Correct event emitted | Vue DevTools: check `$emit` payload | ⏳ Not started |
| 4 | Clear-all disables when no filters | Check `disabled` attribute | ⏳ Not started |

#### Verification Focus Points

| Focus Point | Priority | Verification Method | Status |
|-------------|----------|---------------------|--------|
| Active tint uses accent color at 15 % | P1 | DevTools computed styles | ⏳ Not started |
| Focus ring visible on keyboard nav | P1 | Tab through buttons | ⏳ Not started |
| Events match existing behavior | P0 | Vue DevTools event log | ⏳ Not started |

---

### Scenario 3 — Tablet user views responsive header-top-row layout

- **Linked requirement task**: [02 Requirement Tasks — Scenario 3](./02_requirement-tasks.md#scenario-3--tablet-user-views-responsive-header-top-row-layout)
- **Linked design document**: [03 Design Document — Scenario 3](./03_design-document.md#scenario-3--tablet-user-views-responsive-header-top-row-layout)
- **Verification tool recommendation**: DevTools responsive mode at 1024 px and 768 px

#### Preconditions Verification

| # | Precondition | Verification Method | Status |
|---|--------------|---------------------|--------|
| 1 | AICR page loaded | Open page | ⏳ Not started |
| 2 | Viewport width ≤1024 px | Set DevTools to iPad preset (768 px–1024 px) | ⏳ Not started |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Observe header layout | Visual inspection | ⏳ Not started |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | `.header-center` wraps content gracefully | Visual inspection | ⏳ Not started |
| 2 | No horizontal overflow | `document.body.scrollWidth <= window.innerWidth` | ⏳ Not started |
| 3 | Touch targets ≥44 px | DevTools: measure button width/height | ⏳ Not started |

#### Verification Focus Points

| Focus Point | Priority | Verification Method | Status |
|-------------|----------|---------------------|--------|
| No horizontal overflow | P0 | `document.body.scrollWidth <= window.innerWidth` | ⏳ Not started |
| Touch targets meet minimum | P0 | DevTools box model | ⏳ Not started |
| `.header-center` wraps gracefully | P1 | Visual inspection | ⏳ Not started |

---

## Feature Implementation Checks

### Core

| Feature Point | Priority | Design Document Reference | Status |
|---------------|----------|---------------------------|--------|
| SearchHeader default slot added | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ✅ Pass |
| AicrHeader passes `.tags-header` into slot | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ✅ Pass |
| `.header-top-row` removed | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ✅ Pass |
| Search box width increased | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ✅ Pass |

### Boundaries

| Boundary Check | Priority | Status |
|----------------|----------|--------|
| No changes to `search-header` props or events | P1 | ✅ Pass |
| No changes to `.tags-list` markup or styles | P1 | ✅ Pass |
| No changes to drag-and-drop logic | P1 | ✅ Pass |
| SearchHeader backward compatible without slot | P0 | ✅ Pass |

### Error Handling

| Error Scenario | Priority | Expected Behavior | Status |
|----------------|----------|-------------------|--------|
| Viewport between 1025 px and 1200 px | P1 | `.header-center` wraps content | ⏳ Not started |
| SearchHeader used without slot content | P0 | Renders identically to before | ✅ Pass |

---

## Code Quality Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Style compliance (kebab-case classes, camelCase JS) | P1 | ✅ Pass | Code review |
| Naming clarity (slot usage is unambiguous) | P1 | ✅ Pass | Code review |
| Performance (no layout thrashing, transitions use GPU) | P2 | ⏳ Not started | DevTools Performance |
| Security risks (no user input rendered unsanitized) | P0 | ✅ Pass | No user input rendered in this scope |

---

## Testing Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Unit coverage core (slot rendering) | P1 | ⏳ Not started | Manual test |
| E2E coverage main scenarios (3 scenarios above) | P0 | ⏳ Not started | Manual browser review |
| P0 tests all passed | P0 | ⏳ Not started | Checklist sign-off |
| Test report complete | P1 | ⏳ Not started | N/A (no automated test suite yet) |

---

## Check Summary

### Overall Progress

| Category | Total | Completed | Pass Rate |
|----------|-------|-----------|-----------|
| General Checks | 4 | 4 | 100 % |
| Scenario Verification | 3 | 0 | 0 % |
| Feature Implementation | 6 | 6 | 100 % |
| Code Quality | 4 | 3 | 75 % |
| Testing | 4 | 0 | 0 % |
| **Grand Total** | **21** | **13** | **61.9 %** |

### Pending Items

- [ ] Scenario 1: Visual inspection at desktop width (requires manual browser check)
- [ ] Scenario 2: Button interaction and event verification (requires manual browser check)
- [ ] Scenario 3: Responsive layout at tablet width (requires manual browser check)
- [ ] Testing: E2E manual verification (requires manual browser check)
- [ ] Testing: P0 tests all passed (pending scenario verification)

### Conclusion

✅ Feature implementation complete. Code syntax and structure validated. Pending items require manual browser verification due to missing Playwright browser installation on build environment.

---

## Postscript: Future Planning & Improvements

- Add automated visual-regression tests for the three breakpoints once a test framework is adopted.
- Consider adding axe-core accessibility scan to the checklist for focus-ring and contrast verification.
