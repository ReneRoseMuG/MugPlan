---
name: projekt-manager-planungsleitplanken
description: Use when Codex creates, reviews, updates, or executes any plan for the Projekt Manager repository, whether directly in chat or in Plan mode. Apply before proposing or executing code changes for feature planning, fixes, audits, tests, branch strategy, migrations, API/Web changes, auth/role decisions, UI rules, architecture decisions, and acceptance criteria in this codebase.
---

# Projekt Manager Planungsleitplanken

Use this skill as the planning gate for the Projekt Manager repository.

## Source Of Truth

Treat the repository `agents.md` as the binding source of truth. If this skill and `agents.md` disagree, follow `agents.md` and mention the mismatch.

Use this skill to make sure the right parts of `agents.md`, task files, and project references are considered before a plan is proposed or executed.

## Required Planning Flow

1. Classify the request using `agents.md`.
2. Check the current branch and dirty working tree when the request may lead to changes.
3. Read only the repo sections needed for the request, expanding context when the first focused read is not enough.
4. Identify affected domains, layers, files, APIs, data model, frontend state, tests, logs, and acceptance criteria.
5. Explicitly decide whether auth, roles, permissions, migrations, dumps, fixtures, and UI rules are affected.
6. State assumptions and blockers instead of silently making architecture, product, or scope decisions.
7. Keep the plan proportional to the request class, but never omit security, tests, or data migration implications when they are relevant.

## Reference Selection

Always read `references/plan-checklist.md` for feature, fix, refactor, audit, or test planning.

Read these references only when they are relevant:

- `references/architecture.md` for domain, layer, schema, shared type, dump, repository, or service decisions.
- `references/auth-roles.md` for any API, web workflow, navigation, admin, permission, or protected data change.
- `references/testing.md` for test plans, test migration, fixtures, E2E, test runtime, or acceptance evidence.
- `references/git-workflow.md` for branch, save, savetowork, merge, push, or cleanup planning.
- `references/ui-guidelines.md` for frontend layout, navigation, component, menu, or interaction planning.
- `docs/design-richtlinien-visuell.md` relevant sections for any visual frontend, dashboard, page, component, form, layout, styling, or design-system planning.
- `references/acceptance-criteria.md` before finalizing a plan or calling a task complete.

## Plan Output Rules

Use German for user-facing planning text in this repository.

For implementation plans, include:

- What will change and why.
- Which files, routes, services, components, tests, configs, and migrations are likely affected.
- What remains intentionally unchanged.
- Auth, role, permission, and UI impact when applicable.
- Test strategy with concrete levels and meaningful negative cases.
- Risks, damage potential, blockers, and acceptance criteria.

Do not write vague plans such as "add tests" or "update UI". Name the test types and the behavior they must prove.

## UI Extension Point

Future component, menu, and layout rules belong in `references/ui-guidelines.md`. Binding visual rules belong in `docs/design-richtlinien-visuell.md`. Apply both during every frontend or product-surface plan, loading only the sections relevant to the concrete task.
