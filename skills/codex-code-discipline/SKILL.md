---
name: codex-code-discipline
description: Use at the start of every coding or implementation task before editing files. Provides discipline rules that prevent common regressions: removing existing UI elements, breaking event wiring, reverting valid code because a specification is stale, or causing unintended side effects in adjacent components, styles, services, and callers. Apply especially when touching UI components, CSS or styling, event handlers, service methods, shared logic, API routes, permissions, tests, or files near existing behavior.
---

# Coding Task Discipline

Use this skill before writing code for an implementation task. In this repository, `agents.md` remains binding. If this skill and `agents.md` disagree, follow `agents.md` and mention the mismatch.

## Scan Before Editing

Read the relevant existing code before modifying a file.

- Understand the component or module as it works today.
- Identify existing UI elements, event handlers, conditional renders, dialogs, tabs, menus, and actions before changing UI code.
- For CSS or style changes, identify shared class names, stylesheets, parent selectors, and affected component patterns.
- For service, repository, route, hook, or shared logic changes, find the callers and their assumptions.
- For permissions or visibility changes, identify current frontend and backend enforcement before editing.

Start with a small, task-local analysis and expand only when the first pass is not enough.

## Treat Current Code Carefully

If background documentation and current code contradict each other, treat the code as the current behavior unless the work order explicitly says otherwise.

- Do not revert working, intentional behavior only because a specification appears stale.
- Report discrepancies as observations instead of silently "fixing" them.
- If the request explicitly asks to align code with a specification, follow the request and document the impact.

## Predict Impact

Before implementing, think through direct and indirect effects.

- Which files, callers, tests, API contracts, query keys, migrations, permissions, and UI states can be affected?
- Could a style change cause overflow, overlap, stacking, or layout shifts elsewhere?
- Could a signature or return-value change break existing callers?
- Could a mutation need cache invalidation, server-side validation, or permission tests?

Document the impact when it is more than a narrow local fix.

## Keep Scope Minimal

Change only what the task requires.

- Do not refactor adjacent code because it could be cleaner.
- Do not rename, move, reformat, or reorganize unrelated code.
- Do not add new patterns, framework changes, dependencies, endpoints, services, or files unless the task or approved plan requires them.
- If a side change is necessary, state what it is and why it is required.

## Project-Specific Preservation Checklist

Before finishing, verify the items that match the touched area.

### React And TanStack Query

- Server state still flows through existing query hooks; no new `useState` plus `useEffect` server-state fetch was introduced.
- Mutations use the existing invalidation pattern for the area.
- Components do not receive raw backend error objects when local helpers already normalize them.
- Business rules remain outside React components unless the existing local pattern requires otherwise.

### UI Components

- Existing buttons, inputs, icons, dialogs, tabs, menus, and handlers are still present and functional.
- New UI work is explicitly requested and follows existing components.
- Visible dates use the project format `dd.MM.yy`.
- Layout has no unintended overflow, overlap, or hidden controls.

### API, Roles, And Permissions

- New or changed routes, actions, buttons, lists, forms, and deep links have an explicit role and permission decision.
- Frontend gating improves usability only; server-side enforcement remains mandatory for protected reads and all mutations.
- No existing role restriction is widened without an explicit request.

### Tests

- Existing tests covering the touched behavior are updated when behavior changes.
- Added tests prove observable behavior, include relevant negative cases, and respect the repository test strategy.

If the checklist finds a regression, fix it before closing the task unless the user explicitly accepts the remaining risk.
