# Header Top Row Redesign — Dynamic Checklist

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude Sonnet 4.6 | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Document](./01_requirement-document.md) | [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [CLAUDE.md](../../CLAUDE.md)
>
> **Git Branch**: main
>
> **Doc Start Time**: 09:00:00 | **Doc Last Update Time**: 09:00:00
>

[General Checks](#general-checks) | [Scenario Verification](#main-operation-scenario-verification) | [Feature Implementation](#feature-implementation-checks) | [Code Quality](#code-quality-checks) | [Testing](#testing-checks) | [Check Summary](#check-summary)

---

## General Checks

| Check Item | Priority | Status | Notes |
|------------|----------|--------|-------|
| Title format correct | P0 | ✅ Pass | Document header follows general-document spec |
| Linked document links valid | P0 | ✅ Pass | All relative links point to existing files in same directory |
| Related files created/updated | P0 | ✅ Pass | `aicrHeader/index.html`, `aicrHeader/index.css` |
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
| 1 | AICR page loaded | Open `http://localhost:8000/src/views/aicr/index.html` | ⏳ Not started |
| 2 | Viewport width ≥1025 px | Set browser width to 1440 px | ⏳ Not started |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Observe `.header-top-row` | Visual inspection: search left, toolbar right | ⏳ Not started |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Search and toolbar horizontally aligned | Measure gap with DevTools; expect 16 px | ⏳ Not started |
| 2 | Buttons share same height | Visual inspection; expect 36 px | ⏳ Not started |
| 3 | Active filters show tinted background | Toggle no-tags filter; inspect computed background-color | ⏳ Not started |

#### Verification Focus Points

| Focus Point | Priority | Verification Method | Status |
|-------------|----------|---------------------|--------|
| Gap is 16 px | P0 | DevTools computed styles | ⏳ Not started |
| Buttons equal height | P0 | DevTools computed styles | ⏳ Not started |
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
| 1 | Observe `.header-top-row` | Visual inspection | ⏳ Not started |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Search and toolbar stack vertically | Visual inspection | ⏳ Not started |
| 2 | 12 px gap between stacked items | DevTools computed styles | ⏳ Not started |
| 3 | Touch targets ≥44 px | DevTools: measure button width/height | ⏳ Not started |

#### Verification Focus Points

| Focus Point | Priority | Verification Method | Status |
|-------------|----------|---------------------|--------|
| No horizontal overflow | P0 | `document.body.scrollWidth <= window.innerWidth` | ⏳ Not started |
| Touch targets meet minimum | P0 | DevTools box model | ⏳ Not started |
| Stacked layout visually balanced | P1 | Visual inspection | ⏳ Not started |

---

## Feature Implementation Checks

### Core

| Feature Point | Priority | Design Document Reference | Status |
|---------------|----------|---------------------------|--------|
| `.header-controls` wrapper introduced | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ⏳ Not started |
| Buttons grouped with equal height and gap | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ⏳ Not started |
| Active tint applied to `.tag-filter-btn.active` | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ⏳ Not started |
| Focus ring on `:focus-visible` | P0 | [03_design-document.md#implementation-details](./03_design-document.md#implementation-details) | ⏳ Not started |

### Boundaries

| Boundary Check | Priority | Status |
|----------------|----------|--------|
| No changes to `search-header` props or events | P1 | ⏳ Not started |
| No changes to `.tags-list` markup or styles | P1 | ⏳ Not started |
| No changes to drag-and-drop logic | P1 | ⏳ Not started |
| No new CSS custom properties introduced | P1 | ⏳ Not started |

### Error Handling

| Error Scenario | Priority | Expected Behavior | Status |
|----------------|----------|-------------------|--------|
| Browser lacks `color-mix` support | P1 | Fallback to `rgba(...)` | ⏳ Not started |
| Viewport between 1025 px and 1150 px | P1 | Toolbar wraps below search | ⏳ Not started |

---

## Code Quality Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Style compliance (kebab-case classes, camelCase JS) | P1 | ⏳ Not started | Code review |
| Naming clarity (`.header-controls` is unambiguous) | P1 | ⏳ Not started | Code review |
| Performance (no layout thrashing, transitions use GPU) | P2 | ⏳ Not started | DevTools Performance |
| Security risks (no user input rendered unsanitized) | P0 | ✅ Pass | No user input rendered in this scope |

---

## Testing Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Unit coverage core (active tint class toggle) | P1 | ⏳ Not started | Manual test |
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
| Feature Implementation | 6 | 0 | 0 % |
| Code Quality | 4 | 1 | 25 % |
| Testing | 4 | 0 | 0 % |
| **Grand Total** | **21** | **5** | **23.8 %** |

### Pending Items

- [ ] Scenario 1: Visual inspection at desktop width
- [ ] Scenario 2: Button interaction and event verification
- [ ] Scenario 3: Responsive layout at tablet width
- [ ] Feature implementation: `.header-controls` wrapper verification
- [ ] Feature implementation: Active tint and focus ring verification
- [ ] Code quality: Style and naming review
- [ ] Testing: E2E manual verification

### Conclusion

⏳ Check not started. Pending items require manual browser verification after implementation.

---

## Postscript: Future Planning & Improvements

- Add automated visual-regression tests for the three breakpoints once a test framework is adopted.
- Consider adding axe-core accessibility scan to the checklist for focus-ring and contrast verification.
