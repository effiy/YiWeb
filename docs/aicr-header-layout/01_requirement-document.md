# AICR Header Layout Optimization

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [Usage Document](./04_usage-document.md) | [CLAUDE.md](../../CLAUDE.md)
>

[Feature Overview](#feature-overview) | [User Stories](#user-stories) | [Acceptance Criteria](#acceptance-criteria) | [Feature Details](#feature-details)

---

## Feature Overview

The AICR page header currently places the search header (`header-row`) and the tag filter controls (`tags-header`) side-by-side on desktop, while the tag list (`tags-list`) shares the same row as `tags-header` inside the `session-list-tags` container. This creates a cramped layout where tag items are squeezed into a narrow strip, making scanning and interaction difficult.

This feature restructures the header layout so that the global search bar and the tag filter controls (search + action buttons) occupy a single unified top row, while the tag list gets its own dedicated row with centered alignment. The goal is to improve visual hierarchy, reduce cognitive load, and make tag interactions more comfortable across all screen sizes.

🎯 **Goal**: Unclutter the header by separating controls from content.  
⚡ **Value**: Larger, easier-to-scan tag area with centered alignment.  
📖 **Scope**: CSS/HTML restructuring of `AicrHeader` and `SessionListTags`; no functional changes to search, filtering, or drag-and-drop.

---

## User Stories and Feature Requirements

| User Story | Acceptance Criteria | Process-Generated Documents | Output Smart Documents |
|------------|---------------------|----------------------------|------------------------|
| 🔴 As an AICR user, I want the search bar and tag filter controls to sit on the same row, so that the header feels compact and the controls are grouped logically.<br/><br/>**Main Operation Scenarios**:<br/>- User opens AICR on desktop and sees the new two-row header<br/>- User interacts with tag search and filter buttons in the top row<br/>- User views the page on tablet/mobile and sees a responsive fallback | 1. `header-row` (SearchHeader) and `tags-header` share one visual row on desktop<br/>2. All existing tag filter buttons remain accessible<br/>3. Responsive layout degrades gracefully on tablet and mobile | [Requirement Tasks](./02_requirement-tasks.md)<br/>[Design Document](./03_design-document.md)<br/>[Project Report](./07_project-report.md) | [Generate Document Skill](../../.claude/skills/generate-document/SKILL.md)<br/>[Requirement Document Specification](../../.claude/skills/generate-document/rules/requirement-document.md) |
| 🔴 As an AICR user, I want the tag list to be centered on its own row, so that tags are easier to read and click.<br/><br/>**Main Operation Scenarios**:<br/>- User scans tags on the dedicated centered row<br/>- User clicks or drags tags in the new layout<br/>- User expands/collapses the tag list | 1. `tags-list` occupies a full-width row below the controls<br/>2. Tags are horizontally centered within that row<br/>3. Expand/collapse and drag-and-drop continue to work | Same as above | Same as above |
| 🟡 As an AICR user, I want the layout to remain responsive, so that the experience is consistent across devices.<br/><br/>**Main Operation Scenarios**:<br/>- User resizes browser from desktop to tablet width<br/>- User opens AICR on a mobile device | 1. Layout adapts correctly at 1024px and 768px breakpoints<br/>2. Touch targets remain accessible on mobile | Same as above | Same as above |

---

## Document Specifications

- One numbered set (`01–05`, `07`) corresponds to this single user story.
- Anti-hallucination: exact CSS breakpoints and flex values will be finalized during implementation; where not yet verifiable they are marked `> Pending confirmation (reason: needs browser testing)`.

---

## Acceptance Criteria

### P0 — Core (cannot release without)

1. Desktop viewport (≥1025px): `header-row` and `tags-header` are visually on the same row.
2. Desktop viewport (≥1025px): `tags-list` is on a separate row below, horizontally centered.
3. Tag search input, filter buttons, expand/collapse, and clear-all buttons remain fully functional.
4. Tag click-selection and drag-and-drop reordering continue to work.
5. No visual regressions in `SearchHeader` or adjacent `AicrSidebar` / `AicrCodeArea` components.

### P1 — Important (recommended)

1. Tablet viewport (769px–1024px): controls and tags stack gracefully without overflow.
2. Mobile viewport (≤768px): touch targets meet 44×44dp accessibility guidelines.
3. `prefers-reduced-motion` media query continues to disable transitions.

### P2 — Nice-to-have (optional)

1. Animation polish: smooth transition when the layout shifts on resize.

---

## Feature Details

### 1. Header Row + Tags-Header Merge

- **Description**: On desktop, the global search component (`SearchHeader`, rendered as `.header-row`) and the tag filter control strip (`.tags-header`, containing tag search input + four action buttons) should appear on a single horizontal line.
- **Boundaries**: This is purely a layout change. No props, events, or logic inside `SearchHeader` or tag filters are modified.
- **Value**: Logical grouping of "input controls" vs. "content tags" improves scannability.

### 2. Tags-List Dedicated Centered Row

- **Description**: The tag chips (`.tags-list`) should be removed from the flex row they currently share with `.tags-header` and instead placed on a new full-width row. The chips within that row should be horizontally centered.
- **Boundaries**: Tag wrap behavior (`flex-wrap: wrap`) remains unchanged. Chip styling (colors, borders, hover states) is untouched.
- **Value**: Tags are no longer compressed into a narrow column, making them easier to read and click.

### 3. Responsive Adaptation

- **Description**: On tablet and mobile, the layout should fall back to a vertical stack (controls on top, tags below) to preserve readability.
- **Boundaries**: Existing breakpoints at 1024px and 768px are reused where possible.
- **Value**: Consistent experience across devices without introducing new breakpoint logic.

---

## Usage Scenario Examples

### Scenario 1 — Desktop user scans and selects tags

**Background**: User opens AICR on a 1920px-wide monitor.  
**Operation**: User glances at the top row (search + tag controls), then looks at the centered tag row below and clicks a tag.  
**Result**: The tag becomes selected (highlighted) and the file tree filters accordingly.  
📋 Controls are grouped; 🎨 tags are centered and spacious.

### Scenario 2 — User drags to reorder tags

**Background**: User wants to reorder tags by dragging.  
**Operation**: User drags a tag chip left or right within the centered tag row.  
**Result**: Drop indicators appear correctly (left/right), and the new order is persisted to `localStorage`.  
📋 Drag-and-drop behavior unchanged; 🎨 visual feedback remains clear.

### Scenario 3 — Tablet user views responsive layout

**Background**: User opens AICR on an iPad in landscape mode (≈1024px).  
**Operation**: User observes the header layout.  
**Result**: The layout switches to a stacked format where controls and tags are arranged vertically without clipping or overflow.  
📋 Responsive breakpoint respected; 🎨 no horizontal overflow.

---

## Postscript: Future Planning & Improvements

- Evaluate whether the unused `<session-list-tags>` component should be formally deprecated or kept in sync with the inline markup inside `AicrHeader`.
- Consider adding a subtle background tint or divider between the control row and the tag row to reinforce the new visual hierarchy.
