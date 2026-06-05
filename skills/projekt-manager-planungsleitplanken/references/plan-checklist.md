# Plan Checklist

Use this checklist before proposing or executing a plan in the Projekt Manager repository.

## Minimum Orientation

- Name the request class from `agents.md`.
- Name the branch strategy required by the user or command.
- Name the repo docs or task files read and why they are sufficient.
- Start from directly affected files and only broaden when needed.
- Preserve existing user changes unless the user explicitly requests otherwise.

## Required Plan Questions

- Which domain is affected: project management, documentation, tickets, or cross-cutting infrastructure?
- Is this a business entity, editable support object, admin configuration, or infrastructure?
- Which API routes, services, repositories, shared types, migrations, web APIs, hooks, components, and pages are affected?
- Does the change require auth, role, permission, UI gating, or admin behavior?
- Does the change touch UI visuals, layout, styling, dashboards, forms, or interactions and therefore require `references/ui-guidelines.md` and existing nearby UI patterns?
- Does the change require a DB migration, dump registry update, truncate fixture update, or seed change?
- Does the change require query keys, invalidation, TanStack hooks, or E2E setup changes?
- What remains intentionally unchanged?
- What can break, and how is the risk bounded?

## Plan Shape

For class 4, keep the plan compact:

- What is planned.
- Affected files and why.
- Expected result and risks.

For class 5, include:

- What is planned.
- Affected functions, components, files, and why each is touched.
- Effects on workflows and adjacent systems.
- Risks and damage potential.
- Expected result and acceptance evidence.

## Hard Stop Conditions

Stop and document a blocker when:

- The requested scope contradicts `agents.md`.
- The required architecture decision is not specified and no safe local convention exists.
- The plan would silently remove or overwrite unrelated user changes.
- A required task file or schema source is missing and all dependent work needs it.
