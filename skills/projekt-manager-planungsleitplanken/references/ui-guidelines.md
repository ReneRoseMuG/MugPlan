# UI Guidelines Reference

Use this reference when a plan touches frontend pages, navigation, menus, forms, dashboards, detail views, admin UI, or interaction patterns.

## Current Rules

- There is no binding separate visual design guideline file in this repository unless `agents.md` or the user explicitly names one for the task.
- Follow `agents.md`, existing components, and nearby UI patterns before adding new structures.
- Do not change or add UI unless the user explicitly requested UI work.
- Use TanStack Query hooks for server state.
- Keep business logic out of React components.
- Route API access through the existing API layer for the area.
- Respect auth state and permissions for navigation entries, pages, buttons, forms, dialogs, and protected workflows.
- Treat frontend gating as user experience only; backend guards remain mandatory for protected reads and all mutations.
- Visible, human-readable dates must use `dd.MM.yy`.

## Planning Checks

- Which roles may see the navigation entry, page, list, button, form, dialog, tab, or action?
- Which roles may execute the underlying operation?
- Where is the permission enforced today: UI only, frontend and backend, or server-side only?
- Which controls are hidden, disabled, or replaced with a forbidden state?
- Which existing component pattern should be reused?
- Does the page need a list, detail, form, modal, tabs, or admin table pattern?
- Which empty, loading, error, forbidden, optimistic, and mutation-pending states exist?
- Could the change create overlap, overflow, clipped text, layout shifts, or inaccessible controls?

## Extension Point

Future mandatory component, menu, layout, and interaction rules should be added here. When this file grows, load only the relevant section during planning.
