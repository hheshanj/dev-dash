# UI Fixes & Improvements

## 1. Inconsistent Color Usage (Hardcoded Dark Colors)

### High Priority

| File | Line | Issue | Fix |
|------|------|-------|-----|
| `ProjectCard.jsx` | 11 | `bg-[border]` - invalid CSS class | Change to `bg-slate-200` |
| `ErrorBoundary.jsx` | 27 | `bg-[border]` and `hover:bg-[#363a4a]` - dark colors | Change to `bg-slate-200` and `hover:bg-slate-300` |
| `CommitsTab.jsx` | 381 | `text-slate-200` - too dark for light theme | Change to `text-slate-300` |

### Medium Priority (text-slate-300/400 may need review per context)

- `ProjectDetail.jsx`: Lines 76, 189, 392, 393, 421, 455, 472 - Check if text is readable on light bg
- `CommitsTab.jsx`: Multiple instances of `text-slate-300/400` - verify contrast
- `Dashboard.jsx`: Line 235 - `text-slate-300` for empty state icon
- `ProjectCard.jsx`: Lines 77, 96, 99, 100 - Check text colors

---

## 2. Accessibility Issues

### High Priority

| File | Line | Issue |
|------|------|-------|
| `ProjectDetail.jsx` | 362 | Analyze button lacks `aria-label` for screen readers |
| `ProjectDetail.jsx` | 359 | Re-Analyze button should indicate loading state visually |
| `Dashboard.jsx` | 128 | Search input lacks `aria-label` |
| `SettingsModal.jsx` | 75 | Missing `id` association between label and input |

### Medium Priority

| File | Line | Issue |
|------|------|-------|
| Multiple | - | Missing focus-visible styles for keyboard navigation |
| `ProjectCard.jsx` | - | Missing keyboard navigation (Enter to select) - already has onClick but no keyboard handler |
| `StatusBadge.jsx` | - | Could add `role="status"` for screen reader announcements |

---

## 3. CSS/Tailwind Issues

| File | Line | Issue |
|------|------|-------|
| `ProjectCard.jsx` | 11 | `bg-[border]` custom class doesn't exist - renders as literal CSS |
| `ErrorBoundary.jsx` | 27 | Same `bg-[border]` issue |
| `tailwind.config.js` | - | Custom `border` color defined but `bg-[border]` doesn't work - should use `bg-border` or `bg-slate-200` |

---

## 4. Layout/UX Improvements

### High Priority

| File | Issue | Suggestion |
|------|-------|------------|
| `Dashboard.jsx` | No loading state when saving notes | Add visual feedback in ProjectDetail |
| `ProjectDetail.jsx` | History section always fetches on tab change | Add proper loading state management |
| `ProjectDetail.jsx` | No error boundary around individual tabs | Isolate tab failures |

### Medium Priority

| File | Issue | Suggestion |
|------|-------|------------|
| `Dashboard.jsx` | Search input doesn't clear on Escape | Add handler to clear search |
| `ProjectCard.jsx` | Hover state shows border but no transition | Add smooth transition |
| `Onboarding.jsx` | No validation feedback for paths | Add path validation message |
| `SettingsModal.jsx` | No confirmation before clearing GitHub token | Add confirmation dialog |

---

## 5. Missing Components/States

| File | Missing State |
|------|---------------|
| `ProjectDetail.jsx` | Empty state for Improvements tab before checking |
| `Dashboard.jsx` | "No results" state when search returns empty |
| `CommitsTab.jsx` | Pagination or "load more" for large commit histories |
| All modals | Click outside to close (except Settings) |

---

## 6. Responsive Design Issues

| File | Issue |
|------|-------|
| `Dashboard.jsx` | Project grid doesn't adapt well on very small screens |
| `ProjectDetail.jsx` | Tabs may overflow on narrow widths |
| `SettingsModal.jsx` | Form inputs may overflow on mobile |

---

## 7. Code Consistency

| File | Issue |
|------|-------|
| Multiple | Mix of `className` and `class` (React uses `className`) |
| `ProjectDetail.jsx` | Inconsistent button styles (some use `text-white`, others `text-slate-700`) |
| All | Consider extracting common button variants to reusable components |

---

## Recommended Actions (Priority Order)

1. **Fix broken CSS**: `bg-[border]` → `bg-slate-200` in ProjectCard.jsx and ErrorBoundary.jsx
2. **Fix text colors**: Review all `text-slate-100/200/300` instances and update for light theme
3. **Add accessibility**: aria-labels on buttons and inputs
4. **Add empty states**: Improvements tab, search empty results
5. **Improve loading states**: Better feedback during analysis and saves