# AICR Header Layout Optimization — Usage Document

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Upstream**: [03 Design Document](./03_design-document.md)>

[Feature Intro](#feature-introduction) | [Quick Start](#quick-start) | [Operation Scenarios](#operation-scenarios-core) | [FAQ](#faq) | [Tips](#tips-and-hints)

---

## Feature Introduction

The AICR header has been reorganized to give you more room for your tags. Instead of squeezing the search bar, tag filters, and tag chips into a single horizontal strip, the layout now uses two clean rows:

- **Top row**: global search + tag filter controls (search, filter buttons, expand/collapse, clear).
- **Second row**: all your tags, centered and spacious.

This makes it easier to scan tags at a glance, click them accurately, and drag them into your preferred order. Everything you already know about filtering and searching still works exactly the same—only the visual layout has changed.

🎯 **Compact controls**: All inputs and buttons live on one scannable line.  
⚡ **Spacious tags**: Tags get a full dedicated row with centered alignment.  
🔧 **Same interactions**: Search, filter, click, and drag work just like before.

**Target audience**: Anyone using the AICR page to browse, filter, or reorder file tags.

---

## Quick Start

### Prerequisites

- [ ] You have access to the AICR page (`src/views/aicr/index.html`).
- [ ] Your browser viewport is at least 1025px wide to see the optimized desktop layout.
- [ ] You have at least one file with a tag (or a "no tags" file) so the tag filter area appears.

### 30-Second Onboarding

1. **Open AICR** — Navigate to the page. The header now shows the search bar on the left and tag controls on the right, both on the top row.
2. **Look below** — Your tags appear on the second row, centered.
3. **Click a tag** — It highlights and the file list filters instantly.
4. **Drag a tag** — Grab any tag chip and drag it left or right to reorder. Your order is saved automatically.

---

## Operation Scenarios

### Scenario 1 — Quickly filter by a tag

**Applicable situation**: You want to see only files tagged "frontend".  
**Operation steps**:
1. Look at the centered tag row below the controls.
2. Click the "frontend" tag chip.  
**Expected results**: The chip highlights; the file tree shows only files with the "frontend" tag.  
**Notes**: ✅ Click again to unselect. Hold multiple tags for combined filtering.

### Scenario 2 — Search within tags

**Applicable situation**: You have many tags and want to narrow the list.  
**Operation steps**:
1. Click into the small "搜索标签..." input on the top row (right side).
2. Type a keyword, e.g. "api".  
**Expected results**: The tag row updates to show only tags matching your keyword.  
**Notes**: ✅ Click the × icon inside the input to clear the search instantly.

### Scenario 3 — Reverse-filter (exclude tags)

**Applicable situation**: You want to hide files that have a certain tag.  
**Operation steps**:
1. Click the reverse-filter button (↔ icon) on the top row to activate exclusion mode.
2. Click the tag you want to exclude.  
**Expected results**: The selected tag highlights; the file tree hides files that contain it.  
**Notes**: ✅ The button glows when active. Click it again to return to normal inclusion mode.

### Scenario 4 — Reorder tags by dragging

**Applicable situation**: You want your most-used tags to appear first.  
**Operation steps**:
1. Mouse-down on any tag chip in the centered row.
2. Drag it left or right over another chip.
3. Drop it where you want it.  
**Expected results**: The tag snaps into its new position. The order persists even after you refresh the page.  
**Notes**: ✅ A subtle shadow follows your cursor. A vertical line shows exactly where the drop will land.

### Scenario 5 — Clear all filters

**Applicable situation**: You have applied multiple filters and want to reset everything.  
**Operation steps**:
1. Click the × button (clear-all) on the top row.  
**Expected results**: All selected tags are unselected, the tag search is cleared, and the file tree shows everything again.  
**Notes**: ✅ The button is disabled when no filters are active, so you always know whether filters are applied.

---

## FAQ

### 💡 Basics

**Q: Why did the header layout change?**  
A: The old layout squeezed tags into a narrow strip next to the filter controls. The new two-row layout gives tags their own space, making them easier to scan and click.

**Q: Did any features disappear?**  
A: No. Search, filtering, expand/collapse, drag-and-drop, and clear-all all work exactly the same way.

**Q: Why are my tags centered now?**  
A: Centered alignment creates a balanced visual anchor and makes it easier to scan tags from the middle outward.

### ⚙️ Advanced

**Q: Can I change the tag order permanently?**  
A: Yes. Drag tags into your preferred order; the sequence is saved to your browser's local storage automatically.

**Q: What happens if I have hundreds of tags?**  
A: By default only the first 8 tags are shown. Click the expand button (chevron down) to reveal the rest, or use the tag search box to find a specific tag quickly.

**Q: Does the layout look different on my phone?**  
A: Yes. On mobile and tablet the layout stacks vertically so everything remains readable and tappable.

### 🔧 Troubleshooting

**Q: The drag-and-drop drop indicator looks wrong (top/bottom instead of left/right).**  
A: This can happen if your browser is zoomed or if a custom stylesheet overrides the layout. Try resetting zoom to 100% (Ctrl+0 / Cmd+0).

**Q: Tags are not centered on my screen.**  
A: Make sure your browser width is at least 1025px. Below that width the layout switches to a stacked format for readability.

**Q: I don't see the tag row at all.**  
A: The tag section only appears when at least one file has a tag or when there are files without tags. If your project has no tags yet, the section is hidden.

---

## Tips and Hints

### 💡 Practical tips

1. **Use tag search before expand**: If you have many tags, type a keyword first instead of expanding the full list—it's faster.
2. **Combine filters**: Select multiple tags to narrow results. Use reverse-filter to exclude specific tags from the selection.
3. **Reorder by frequency**: Drag your most-used tags to the left so they stay visible even when collapsed.

### ⌨️ Shortcuts

- `Esc` inside the tag search input clears the search immediately.
- `Ctrl+K` (or `Cmd+K`) focuses the global search bar at the top-left.

### 📚 Best practices

- **Naming consistency**: Use short, descriptive tag names so the centered row stays scannable.
- **Regular cleanup**: Periodically clear unused tags via the tag manager to keep the row lightweight.

---

## Appendix

### Related Resources

- [AICR Page Entry](../src/views/aicr/index.js)
- [Design Document](./03_design-document.md)
- [Dynamic Checklist](./05_dynamic-checklist.md)

---

## Postscript: Future Planning & Improvements

- Add keyboard navigation (arrow keys) to move focus between tag chips for accessibility.
- Consider a "pin" feature that keeps certain tags always visible regardless of collapse state.
