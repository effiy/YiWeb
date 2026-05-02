# Header Top Row Redesign

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude Sonnet 4.6 | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [Usage Document](./04_usage-document.md) | [CLAUDE.md](../../CLAUDE.md)
>
> **Git Branch**: main
>
> **Doc Start Time**: 08:50:00 | **Doc Last Update Time**: 08:50:00
>

[Feature Overview](#feature-overview) | [User Stories](#user-stories-and-feature-requirements) | [Acceptance Criteria](#acceptance-criteria) | [Feature Details](#feature-details)

---

## Feature Overview

The `header-top-row` redesign refines the top control bar of the AICR page header to improve visual clarity and reduce interaction friction. The current row bundles a global search component and a cluster of tag-filter controls into a single flex container, which creates uneven spacing and makes individual actions harder to locate at a glance. This redesign tightens the layout, establishes clearer visual grouping, and adds responsive affordances so the header remains usable on narrow desktops and tablets.

Scope is limited to the `.header-top-row` wrapper and its immediate children (`search-header` and `.tags-header`). The `.tags-list` strip below is not affected. Non-goals include changing tag drag-and-drop logic, SearchHeader internals, or the underlying tag data model.

🎯 **Clearer hierarchy**: Search and filters occupy distinct visual zones.  
⚡ **Faster scanning**: Controls are ordered by frequency of use and grouped logically.  
📖 **Consistent language**: Spacing, focus states, and transitions align with the rest of the AICR design system.

---

## User Stories and Feature Requirements

**Priority**: 🔴 P0 | 🟡 P1 | 🟢 P2

| User Story | Acceptance Criteria | Process-Generated Documents | Output Smart Documents |
|------------|---------------------|----------------------------|------------------------|
| 🔴 As an AICR user, I want the top header row to have a cleaner layout, so that I can quickly locate search and filter controls.<br/><br/>**Main Operation Scenarios**:<br/>- Desktop user views the optimized header-top-row layout<br/>- User interacts with consolidated tag filter controls<br/>- Tablet user views the responsive header-top-row layout | 1. `.header-top-row` uses a refined flex layout with clear separation between search and tag controls.<br/>2. Tag filter buttons are grouped in a compact toolbar with consistent spacing.<br/>3. All interactive elements have visible hover and focus states.<br/>4. The layout adapts gracefully at 1025 px, 1024 px, and 768 px breakpoints. | [Requirement Tasks](./02_requirement-tasks.md)<br/>[Design Document](./03_design-document.md)<br/>[Project Report](./07_project-report.md) | [Generate Document Skill](../../.claude/skills/generate-document/SKILL.md)<br/>[Requirement Document Specification](../../.claude/skills/generate-document/rules/requirement-document.md)<br/>[Requirement Document Template](../../.claude/skills/generate-document/templates/requirement-document.md)<br/>[Requirement Document Checklist](../../.claude/skills/generate-document/checklists/requirement-document.md) |

---

## Document Specifications

One user story corresponds to one `docs/<feature-name>/` numbered set (01–05, 07). This feature set covers the `header-top-row-redesign` scope.

---

## Acceptance Criteria

### P0 — Core (cannot release without)

1. `.header-top-row` flex layout is restructured with a dedicated `.header-controls` wrapper for tag buttons.
2. Tag filter buttons (`no-tags`, `reverse`, `expand`, `clear`) render as a unified toolbar with equal heights and shared border radius.
3. The search box and tag toolbar are vertically centered and separated by a consistent `16 px` gap.
4. All breakpoints (`≥1025 px`, `≤1024 px`, `≤768 px`) produce a usable layout without clipping or overflow.

### P1 — Important (recommended)

5. Active filter states use a distinct background color (`--accent-primary` at 15 % opacity) instead of only a border change.
6. Focus rings are visible for keyboard navigation (`outline: 2px solid var(--accent-primary)`).
7. Clear-all button is rightmost in the toolbar to follow reading-order conventions.

### P2 — Nice-to-have

8. Subtle `0.2 s` transition on background-color and transform for all filter buttons.
9. Tooltip text for icon-only buttons is localized and concise.

---

## Feature Details

### Visual Grouping

- **Description**: Tag-filter controls are wrapped in a single `.header-controls` flex container so they read as one unit.
- **Boundaries**: Does not change the internal markup of `search-header` or `.tags-list`.
- **Value**: Reduces cognitive load by separating "search" from "filter" at a glance.

### Control Reordering

- **Description**: Buttons inside `.tags-header` are reordered to: tag-search input → no-tags filter → reverse filter → expand/collapse → clear-all.
- **Boundaries**: Event handlers and emitted events remain identical.
- **Value**: Places the most frequently toggled controls (tag search and no-tags) closer to the start of the reading order.

### Responsive Refinement

- **Description**: Narrow desktop widths (`1025 px–1150 px`) allow the tag toolbar to wrap beneath the search box instead of squeezing.
- **Boundaries**: Tablet and mobile layouts remain stacked; no new breakpoints are introduced.
- **Value**: Prevents controls from being truncated on small laptops.

---

## Usage Scenario Examples

### 📋 Scenario 1 — Desktop user scans the header

- **Background**: User opens the AICR page on a 1440 px monitor.
- **Operation**: User glances at the header to locate the search box and tag filters.
- **Result**: Search box sits on the left, tag toolbar sits to its right with ample gap, and active filters are highlighted with a tinted background.

### 🎨 Scenario 2 — User toggles a filter

- **Background**: User wants to view files without tags.
- **Operation**: User clicks the "no tags" icon button in the tag toolbar.
- **Result**: Button background shifts to the active tint, the file tree updates, and focus remains visible for keyboard users.

---

## Postscript: Future Planning & Improvements

- Evaluate collapsing the tag toolbar into a dropdown on very narrow desktops (`1025 px–1100 px`) to reclaim horizontal space.
- Consider adding keyboard shortcuts (`Ctrl + K` for tag search, `Esc` to clear all filters) in a follow-up accessibility pass.
