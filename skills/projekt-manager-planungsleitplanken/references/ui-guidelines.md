# UI Guidelines Reference

Use this reference when a plan touches frontend pages, navigation, menus, forms, dashboards, detail views, admin UI, or interaction patterns.

## Current Rules

- Treat `docs/design-richtlinien-visuell.md` as the binding visual design source for `apps/web`.
- For UI-related work, load the relevant sections of `docs/design-richtlinien-visuell.md` before planning visual or interaction changes.
- Follow existing component and layout patterns before adding new ones.
- Use TanStack Query hooks for server state.
- Keep business logic out of React components.
- Route all API access through `src/api`.
- Respect auth state and permissions from `useAuth` for navigation entries, pages, buttons, and protected workflows.
- Treat frontend gating as user experience only; backend guards remain mandatory.

## Planning Checks

- Which navigation or menu entries appear for each role?
- Which visual design guideline sections apply to this page, component, form, dashboard, or interaction?
- Which controls are hidden, disabled, or replaced with a forbidden state?
- Which existing component pattern should be reused?
- Does the page need a list, detail, form, modal, tabs, or admin table pattern?
- Which empty, loading, error, forbidden, and mutation-pending states exist?

## Extension Point

Future mandatory component, menu, layout, and interaction rules should be added here. When this file grows, load only the relevant section during planning.
