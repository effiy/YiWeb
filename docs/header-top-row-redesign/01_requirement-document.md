# Header Top Row Redesign

> **Document Version**: v2.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude Sonnet 4.6 | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [Usage Document](./04_usage-document.md) | [CLAUDE.md](../../CLAUDE.md)
>
> **Git Branch**: main
>
> **Doc Start Time**: 17:50:00 | **Doc Last Update Time**: 17:50:00
>

[Feature Overview](#feature-overview) | [User Stories](#user-stories-and-feature-requirements) | [Acceptance Criteria](#acceptance-criteria) | [Feature Details](#feature-details)

---

## Feature Overview

The `header-top-row` redesign moves the tag-filter controls (`.tags-header`) from an external sibling position into the `SearchHeader` component's `.header-center` area, placing them immediately after the search box. This unifies the search and filter surface into a single visual line and allows the search box to expand to a wider width. The shared `SearchHeader` CDN component gains a default slot so that consumers can inject custom content into `.header-center` without breaking existing usage.

Scope includes the `SearchHeader` template and CSS, the `AicrHeader` template and CSS, and responsive adjustments. Non-goals include changing tag drag-and-drop logic, SearchHeader props/events, or the underlying tag data model.

🎯 **Unified search/filter surface**: Tag controls sit inside the same visual zone as the search box.  
⚡ **Wider search box**: More horizontal space for long queries.  
📖 **Backward compatible**: SearchHeader slot is optional; other pages are unaffected.

---

## User Stories and Feature Requirements

**Priority**: 🔴 P0 | 🟡 P1 | 🟢 P2

| User Story | Acceptance Criteria | Process-Generated Documents | Output Smart Documents |
|------------|---------------------|----------------------------|------------------------|
| 🔴 As an AICR user, I want the tag toolbar to sit next to the search box inside the header center, so that search and filter feel like one unified control surface.<br/><br/>**Main Operation Scenarios**:<br/>- Desktop user views the optimized header-top-row layout<br/>- User interacts with consolidated tag filter controls<br/>- Tablet user views the responsive header-top-row layout | 1. `.tags-header` is rendered inside `SearchHeader`'s `.header-center`, after `.search-box`.<br/>2. The search box is visibly wider than before.<br/>3. `SearchHeader` remains backward compatible when no slot content is provided.<br/>4. The layout adapts gracefully at 1025 px, 1024 px, and 768 px breakpoints. | [Requirement Tasks](./02_requirement-tasks.md)<br/>[Design Document](./03_design-document.md)<br/>[Project Report](./07_project-report.md) | [Generate Document Skill](../../.claude/skills/generate-document/SKILL.md)<br/>[Requirement Document Specification](../../.claude/skills/generate-document/rules/requirement-document.md)<br/>[Requirement Document Template](../../.claude/skills/generate-document/templates/requirement-document.md)<br/>[Requirement Document Checklist](../../.claude/skills/generate-document/checklists/requirement-document.md) |

---

## Document Specifications

One user story corresponds to one `docs/<feature-name>/` numbered set (01–05, 07). This feature set covers the `header-top-row-redesign` scope.

---

## Acceptance Criteria

### P0 — Core (cannot release without)

1. `SearchHeader` template exposes a default `<slot>` inside `.header-center`, positioned after `.search-box`.
2. `AicrHeader` passes `.tags-header` content into `SearchHeader` via the default slot.
3. `.search-box` width is increased in the AICR context (minimum `max-width: 520 px` on desktop, larger on ultra-wide).
4. All breakpoints (`≥1025 px`, `≤1024 px`, `≤768 px`) produce a usable layout without clipping or overflow.
5. `SearchHeader` renders identically to before when no slot content is provided (backward compatibility).

### P1 — Important (recommended)

6. `.header-center` accommodates both `.search-box` and slot content on a single line where possible.
7. Responsive rules in `AicrHeader` CSS are updated to reflect the removal of `.header-top-row`.

### P2 — Nice-to-have

8. Subtle `0.2 s` transition on layout changes.
9. Slot content is centered vertically within `.header-center`.

---

## Feature Details

### Slot-Based Composition

- **Description**: `SearchHeader` gains a default Vue slot inside `.header-center`. `AicrHeader` uses this slot to inject `.tags-header` directly after `.search-box`.
- **Boundaries**: Does not change `SearchHeader` props, events, or internal logic.
- **Value**: Eliminates the need for an external flex wrapper (`.header-top-row`) and creates a tighter visual grouping.

### Search Box Width Increase

- **Description**: In the AICR context, `.search-box` `max-width` is increased from `420 px` to at least `520 px` (desktop) and `600 px` (ultra-wide).
- **Boundaries**: Only affects AICR page; other consumers of `SearchHeader` retain their own overrides.
- **Value**: More room for long search queries.

### DOM Simplification

- **Description**: The `.header-top-row` wrapper in `AicrHeader` is removed. `SearchHeader` becomes a direct child of `.aicr-header`, followed by `.session-list-tags`.
- **Boundaries**: No JavaScript logic changes; only template structure and CSS selectors change.
- **Value**: Fewer wrapper layers, simpler layout logic.

---

## Usage Scenario Examples

### 📋 Scenario 1 — Desktop user scans the header

- **Background**: User opens the AICR page on a 1440 px monitor.
- **Operation**: User glances at the header.
- **Result**: Search box and tag toolbar share the same `.header-center` row, search box is wider, and active filters are highlighted.

### 🎨 Scenario 2 — User toggles a filter

- **Background**: User wants to view files without tags.
- **Operation**: User clicks the "no tags" icon button in the tag toolbar.
- **Result**: Button background shifts to the active tint; file tree updates.

---

## Postscript: Future Planning & Improvements

- Evaluate whether `.header-center` should use a named slot (e.g., `after-search`) instead of the default slot for clearer API semantics.
- Consider adding a `compact` prop to `SearchHeader` that reduces padding when slot content is present.
