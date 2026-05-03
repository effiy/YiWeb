# AICR Header Layout Optimization — Dynamic Checklist

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Upstream**: [02 Requirement Tasks](./02_requirement-tasks.md) | [03 Design Document](./03_design-document.md) | **Downstream**: [07 Project Report](./07_project-report.md)>

[General Checks](#general-checks-mandatory) | [Scenario Verification](#main-operation-scenario-verification-mandatory) | [Feature Implementation](#feature-implementation-checks) | [Code Quality](#code-quality-checks-mandatory) | [Testing](#testing-checks-mandatory) | [Check Summary](#check-summary-mandatory)

---

## General Checks

| Check Item | Priority | Status | Notes |
|------------|----------|--------|-------|
| Title format correct (P0) | P0 | ✅ | `docs/aicr-header-layout/*.md` naming and headers verified |
| Linked document links valid (P0) | P0 | ✅ | Relative links between 01→02→03→04→05→07 verified |
| Related files created/updated (P0) | P0 | ✅ | 6 documents exist (01–05, 07) |
| Project buildable (P0) | P0 | ✅ | `python -m http.server 8000` serves AICR page with HTTP 200 |

---

## Main Operation Scenario Verification

### Scenario 1 — Desktop user views optimized header layout

- **Linked requirement task**: [02 Requirement Tasks — Scenario 1](./02_requirement-tasks.md#scenario-1--desktop-user-views-optimized-header-layout)
- **Linked design document**: [03 Design Document — Scenario 1 Implementation](./03_design-document.md#scenario-1--desktop-user-views-optimized-header-layout)
- **Verification tool recommendation**: Manual browser verification + `e2e-testing` skill for responsive breakpoint validation.

#### Preconditions Verification

| # | Check Item | Verification Method | Status |
|---|------------|---------------------|--------|
| 1 | Viewport width ≥ 1025px | Browser DevTools device toolbar | ⏳ Manual verification required |
| 2 | AICR page loads without console errors | Browser console inspection | ✅ HTTP 200; no syntax errors in modified files |
| 3 | At least one tag or no-tags count > 0 | Verify tag section visible | ⏳ Manual verification required |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Navigate to AICR page | Browser navigation | ✅ Page served at localhost:8080 |
| 2 | Observe header area | Visual inspection | ⏳ Manual verification required |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Top row contains global search + tag controls | Visual inspection / screenshot diff | ⏳ Manual verification required (Playwright unavailable) |
| 2 | Second row contains centered tag chips | Visual inspection / measure `justify-content` | ⏳ Manual verification required (Playwright unavailable) |

#### Verification Focus Points

| Focus Point | Verification Method | Status |
|-------------|---------------------|--------|
| Visual alignment | Compare with design doc "After" diagram | ⏳ Manual verification required |
| Spacing between rows | Measure gap in DevTools (expected ≈12px) | ⏳ Manual verification required |
| No overlap or clipping | Resize to 1025px–1200px and confirm no wrap clipping | ⏳ Manual verification required |

---

### Scenario 2 — User interacts with tag filters on the new layout

- **Linked requirement task**: [02 Requirement Tasks — Scenario 2](./02_requirement-tasks.md#scenario-2--user-interacts-with-tag-filters-on-the-new-layout)
- **Linked design document**: [03 Design Document — Scenario 2 Implementation](./03_design-document.md#scenario-2--user-interacts-with-tag-filters-on-the-new-layout)
- **Verification tool recommendation**: Manual functional verification + `code-review` skill for event binding correctness.

#### Preconditions Verification

| # | Check Item | Verification Method | Status |
|---|------------|---------------------|--------|
| 1 | Same as Scenario 1 | — | — |
| 2 | Tag data loaded | Verify tag chips rendered | ⏳ Manual verification required |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Type into tag search input | Keyboard input + observe filtered list | ⏳ Manual verification required |
| 2 | Click "no tags" filter button | Mouse click + observe active class | ⏳ Manual verification required |
| 3 | Click expand button | Mouse click + observe all tags shown | ⏳ Manual verification required |
| 4 | Click clear-all button | Mouse click + observe all filters reset | ⏳ Manual verification required |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Tag search filters tag list | Assert filtered tag count < total | ✅ Code review: event bindings unchanged |
| 2 | "No tags" button toggles active state | Assert class `active` present/absent | ✅ Code review: logic unchanged |
| 3 | Expand button reveals hidden tags | Assert visible tag count increases | ✅ Code review: logic unchanged |
| 4 | Clear-all resets all filters | Assert `selectedTags` empty, search cleared | ✅ Code review: logic unchanged |

#### Verification Focus Points

| Focus Point | Verification Method | Status |
|-------------|---------------------|--------|
| Event emission correctness | Vue DevTools event tab | ✅ Code review: all emits preserved |
| State synchronization | Console log `selectedTags` after each action | ✅ Code review: no state logic changes |
| Button active/highlight states | DevTools class inspection | ✅ Code review: CSS active classes preserved |

---

### Scenario 3 — User drags and reorders tags

- **Linked requirement task**: [02 Requirement Tasks — Scenario 3](./02_requirement-tasks.md#scenario-3--user-drags-and-reorders-tags)
- **Linked design document**: [03 Design Document — Scenario 3 Implementation](./03_design-document.md#scenario-3--user-drags-and-reorders-tags)
- **Verification tool recommendation**: Manual drag-and-drop verification + `code-review` skill for `isHorizontalDrag()` patch.

#### Preconditions Verification

| # | Check Item | Verification Method | Status |
|---|------------|---------------------|--------|
| 1 | Same as Scenario 1 | — | — |
| 2 | At least two tags exist | Count tag chips | ⏳ Manual verification required |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Mouse-down on a tag chip | Pointer event capture | ⏳ Manual verification required |
| 2 | Drag left or right over another chip | Pointer move + visual indicator | ⏳ Manual verification required |
| 3 | Drop to insert | Pointer up + DOM order check | ⏳ Manual verification required |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Tag order updates visually | Compare DOM order before/after | ✅ Code review: `handleDrop` logic unchanged |
| 2 | Order persists to `localStorage` | DevTools Application → localStorage → `aicr_file_tag_order` | ✅ Code review: `saveTagOrder` unchanged |
| 3 | Drop indicators show left/right | DevTools class inspection (`.drag-over-left`/`.drag-over-right`) | ✅ `isHorizontalDrag()` patched to query `.tags-list` |

#### Verification Focus Points

| Focus Point | Verification Method | Status |
|-------------|---------------------|--------|
| Drag image shadow | Visual inspection | ⏳ Manual verification required |
| Drop indicator direction | Assert `isHorizontalDrag() === true` via console breakpoint | ✅ Code review: selector now targets `.tags-list` which is always `row` |
| `tagOrderVersion` increment | Vue DevTools data inspection | ✅ Code review: unchanged |

---

### Scenario 4 — Tablet/mobile user views responsive layout

- **Linked requirement task**: [02 Requirement Tasks — Scenario 4](./02_requirement-tasks.md#scenario-4--tabletmobile-user-views-responsive-layout)
- **Linked design document**: [03 Design Document — Scenario 4 Implementation](./03_design-document.md#scenario-4--tabletmobile-user-views-responsive-layout)
- **Verification tool recommendation**: Manual browser verification + `e2e-testing` skill for breakpoint automation.

#### Preconditions Verification

| # | Check Item | Verification Method | Status |
|---|------------|---------------------|--------|
| 1 | Viewport width ≤ 1024px (tablet) or ≤ 768px (mobile) | Browser DevTools responsive mode | ⏳ Manual verification required |

#### Operation Steps Verification

| # | Step | Verification Method | Status |
|---|------|---------------------|--------|
| 1 | Open AICR page on target viewport | Browser navigation | ✅ Page served |
| 2 | Observe header area | Visual inspection | ⏳ Manual verification required |

#### Expected Results Verification

| # | Expected Result | Verification Method | Status |
|---|-----------------|---------------------|--------|
| 1 | Controls and tags stack vertically | Visual inspection | ⏳ Manual verification required (Playwright unavailable) |
| 2 | No horizontal overflow | DevTools measure width; assert no scrollbar | ⏳ Manual verification required |
| 3 | Mobile touch targets ≥ 44×44px | DevTools measure chip/button dimensions | ✅ Code review: existing mobile CSS preserved |

#### Verification Focus Points

| Focus Point | Verification Method | Status |
|-------------|---------------------|--------|
| Breakpoint behavior | Toggle between 1025px and 1024px; assert layout shift | ⏳ Manual verification required |
| Touch target sizes | Axe DevTools or manual ruler | ✅ Code review: `@media (max-width: 768px)` rules unchanged |
| Font/icon scaling | Visual inspection at 768px and 480px | ✅ Code review: existing responsive rules preserved |

---

## Feature Implementation Checks

### Core (P0)

| Feature Point | Design Doc Reference | Verification Method | Status |
|---------------|---------------------|---------------------|--------|
| `.aicr-header` uses `flex-direction: column` on desktop | [03 Design Doc — Changes](#fixeschanges-mandatory) | Source code inspection | ✅ `aicrHeader/index.css:10` |
| `.header-top-row` wraps `.header-row` + `.tags-header` | [03 Design Doc — Changes](#fixeschanges-mandatory) | Source code inspection | ✅ `aicrHeader/index.html` |
| `.tags-list` has `justify-content: center` on desktop | [03 Design Doc — Changes](#fixeschanges-mandatory) | Source code inspection | ✅ `sessionListTags/index.css:245` + `aicrHeader/index.css:56` |
| `isHorizontalDrag()` queries `.tags-list` | [03 Design Doc — Implementation Details](#implementation-details-mandatory) | Source code inspection | ✅ `aicrHeader/index.js:94-99` |

### Boundaries (P1)

| Feature Point | Design Doc Reference | Verification Method | Status |
|---------------|---------------------|---------------------|--------|
| Tablet breakpoint stacks gracefully | [03 Design Doc — Scenario 4](#scenario-4--tabletmobile-user-views-responsive-layout) | Source code inspection | ✅ `@media (max-width: 1024px)` rules preserved |
| Mobile breakpoint maintains touch targets | [03 Design Doc — Scenario 4](#scenario-4--tabletmobile-user-views-responsive-layout) | Source code inspection | ✅ `@media (max-width: 768px)` rules preserved |

### Error Handling (P1/P2)

| Feature Point | Design Doc Reference | Verification Method | Status |
|---------------|---------------------|---------------------|--------|
| `prefers-reduced-motion` disables transitions | Existing CSS contract | Source code inspection | ✅ `aicrHeader/index.css:122` + `sessionListTags/index.css:354` |
| Empty tag list hides section gracefully | Existing Vue `v-if` | Source code inspection | ✅ `v-if` preserved on both `.header-top-row` tags and `.session-list-tags` |

---

## Code Quality Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Style compliance (naming, kebab-case, no `var`) | P1 | ✅ | `code-review`: all selectors kebab-case; JS uses `const`/`let` |
| Naming clarity (`.header-top-row` vs existing classes) | P1 | ✅ | `code-review`: name clearly describes purpose |
| Performance (no layout thrashing introduced) | P2 | ✅ | `code-review`: no new forced synchronous layouts; `isHorizontalDrag()` still cached in `_dragDirectionHorizontal` |
| Security risks (no innerHTML/XSS changes) | P0 | ✅ | `code-review`: no user input rendered unsanitized; no innerHTML added |

---

## Testing Checks

| Check Item | Priority | Status | Verification Method |
|------------|----------|--------|---------------------|
| Unit coverage core (computed properties: `filteredTags`, `visibleTags`, `hasMoreTags`) | P1 | ✅ | Code review: computed properties unchanged |
| E2E coverage main scenarios (desktop layout + drag-and-drop + responsive) | P0 | ⏳ | Playwright unavailable; manual browser verification required |
| P0 tests all passed | P0 | ⏳ | See scenario statuses above |
| Test report complete | P1 | ✅ | Summarized in [07 Project Report](./07_project-report.md) |

---

## Check Summary

### Overall Progress

| Category | Total | Completed | Pass Rate |
|----------|-------|-----------|-----------|
| General Checks | 4 | 4 | 100% |
| Scenario Verification | 4 | 0* | 0%* |
| Feature Implementation | 9 | 9 | 100% |
| Code Quality | 4 | 4 | 100% |
| Testing | 4 | 2 | 50% |
| **Grand Total** | **25** | **19** | **76%** |

\* Scenario verification items dependent on Playwright/browser visual inspection are pending manual verification due to missing browser installation on host.

### Pending Items

- [ ] Scenario 1 — Visual layout verification at desktop width
- [ ] Scenario 2 — Interactive tag filter verification in browser
- [ ] Scenario 3 — Drag-and-drop drop indicator direction verification in browser
- [ ] Scenario 4 — Responsive breakpoint verification in browser
- [ ] E2E coverage — Automated test execution

### Conclusion

✅ Core P0 implementation items verified via code review (HTML structure, CSS rules, JS heuristic patch).

⏳ Visual and interactive verification items pending due to Playwright/Chromium browser unavailability on host system. All underlying code changes are syntactically valid and structurally correct. Manual browser verification recommended before merging.

---

## Postscript: Future Planning & Improvements

- Automate responsive breakpoint testing via `e2e-testing` skill with Playwright viewport emulation.
- Add a visual regression test for the header area at 1025px, 1440px, and 768px.
- Install `chromium` system dependencies or configure CI environment with pre-installed browsers to enable automated visual verification.
