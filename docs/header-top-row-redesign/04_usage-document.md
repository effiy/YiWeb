# Header Top Row Redesign — Usage Document

> **Document Version**: v1.0 | **Last Updated**: 2026-05-02 | **Maintainer**: Claude Sonnet 4.6 | **Tool**: Claude Code
>
> **Related Documents**: [Requirement Document](./01_requirement-document.md) | [Requirement Tasks](./02_requirement-tasks.md) | [Design Document](./03_design-document.md) | [CLAUDE.md](../../CLAUDE.md)
>
> **Git Branch**: main
>
> **Doc Start Time**: 08:58:00 | **Doc Last Update Time**: 08:58:00
>

[Feature Intro](#feature-introduction) | [Quick Start](#quick-start) | [Operation Scenarios](#operation-scenarios) | [FAQ](#faq) | [Tips](#tips-and-hints)

---

## Feature Introduction

The redesigned `header-top-row` makes the AICR page header cleaner and easier to use. The search box and tag-filter controls now occupy distinct visual zones, and the filter buttons are grouped into a compact toolbar with clear active states. Whether you are searching for files, filtering by tags, or clearing filters, the controls are easier to locate and interact with.

This update is purely visual: all keyboard shortcuts, click behaviors, and tag-dragging features work exactly as before.

🎯 **Clearer layout**: Search and filters are visually separated.  
⚡ **Faster recognition**: Active filters show a tinted background.  
🔧 **Better accessibility**: Focus rings help keyboard users track their position.

**Target audience**: All AICR users who interact with the header search and tag filters.

---

## Quick Start

### Prerequisites

- [ ] AICR page is open in a modern browser (Chrome, Firefox, Safari, Edge).
- [ ] Viewport is at least `768 px` wide (tablet or desktop).

### 30-Second Onboarding

1. **Locate the search box** on the left side of the header top row.
2. **Locate the tag toolbar** to the right of the search box (or below it on narrow screens).
3. **Click a filter button** (no-tags, reverse, expand) to toggle it; notice the tinted background when active.
4. **Click the clear-all button** (× icon, rightmost) to reset all filters.
5. **Use `Tab`** to move focus between controls; a blue focus ring shows the current item.

---

## Operation Scenarios

### Scenario 1 — Filter files without tags

- **Applicable situation**: You want to see only files that have no tags assigned.
- **Operation steps**:
  1. Look at the tag toolbar to the right of the search box.
  2. Click the **tag-with-slash** icon (first button in the toolbar).
- **Expected result**: The button background turns tinted blue, and the file tree shows only files without tags.
- **Notes**: ✅ Click again to turn the filter off.

### Scenario 2 — Reverse the tag selection

- **Applicable situation**: You want to exclude the tags you have selected instead of including them.
- **Operation steps**:
  1. Select one or more tags from the tag list below the header.
  2. Click the **swap-arrows** icon (second button in the toolbar).
- **Expected result**: The button turns tinted blue, and the file tree now shows files that do **not** contain the selected tags.
- **Notes**: ✅ This works in combination with the no-tags filter.

### Scenario 3 — Expand all tags

- **Applicable situation**: Many tags are hidden behind the expand button, and you want to see them all.
- **Operation steps**:
  1. Click the **chevron-down** icon (third button in the toolbar).
- **Expected result**: The tag list below expands to show all tags; the button icon changes to a chevron-up.
- **Notes**: ✅ On narrow screens, expanding tags may increase header height; this is expected.

### Scenario 4 — Clear all filters

- **Applicable situation**: You have applied one or more filters and want to reset everything.
- **Operation steps**:
  1. Click the **×** icon (rightmost button in the toolbar).
- **Expected result**: All filters are removed, the file tree returns to the unfiltered view, and the button becomes disabled until a new filter is applied.
- **Notes**: ✅ The clear-all button is disabled when no filters are active.

### Scenario 5 — Keyboard navigation

- **Applicable situation**: You prefer using the keyboard instead of the mouse.
- **Operation steps**:
  1. Press `Tab` to move focus into the header.
  2. Continue pressing `Tab` to cycle through the search box, tag search, and filter buttons.
  3. Press `Space` or `Enter` to activate the focused button.
- **Expected result**: A blue focus ring appears around the focused element, and activation behaves the same as a mouse click.
- **Notes**: ✅ Focus rings are visible only during keyboard navigation; mouse clicks do not show them.

---

## FAQ

### 💡 Basics

**Q: Why did the header layout change?**  
A: The previous layout placed search and filter controls side by side without clear grouping, which made scanning harder. The redesign adds a unified toolbar for filters and improves visual separation.

**Q: Do I need to learn new shortcuts?**  
A: No. All existing behaviors remain the same. Only the visual presentation changed.

**Q: What does the tinted background mean?**  
A: A tinted background on a filter button means that filter is currently active. For example, the no-tags button turns tinted when you are viewing files without tags.

### ⚙️ Advanced

**Q: Can I customize the toolbar order?**  
A: Not through the UI. The order (no-tags → reverse → expand → clear) is fixed by design to match frequency of use.

**Q: Why does the toolbar move below the search box on some screens?**  
A: On narrow desktops (`1025 px–1150 px`), the toolbar wraps beneath the search box to prevent controls from being cut off. This is intentional responsive behavior.

### 🔧 Troubleshooting

**Q: The focus ring is not showing. Is something broken?**  
A: Focus rings appear only when navigating with the keyboard (`Tab`). If you are using a mouse, they are intentionally hidden to reduce visual clutter.

**Q: An active filter looks too subtle on my monitor.**  
A: The active tint uses your theme's accent color at `15 %` opacity. If your monitor has low contrast, try increasing the browser zoom or adjusting your OS contrast settings.

---

## Tips and Hints

### 💡 Practical tips

1. **Combine filters**: You can use no-tags + reverse together to fine-tune your view.
2. **Quick clear**: The clear-all button is always the rightmost item, so you can find it without reading labels.
3. **Tag search first**: If you have many tags, use the tag search input (left of the toolbar) to narrow the list before clicking filters.

### ⌨️ Shortcuts

- `Tab` — Move focus to the next header control.
- `Shift + Tab` — Move focus to the previous header control.
- `Space` / `Enter` — Activate the focused button.

### 📚 Best practices

- Use the expand button sparingly on small screens; a very long tag list pushes the file tree far down the page.
- If you frequently use the same filter combination, consider bookmarking the page after applying filters (future feature).

---

## Postscript: Future Planning & Improvements

- Add a keyboard shortcut reference panel accessible from the header.
- Consider a "save filter preset" feature for power users.
