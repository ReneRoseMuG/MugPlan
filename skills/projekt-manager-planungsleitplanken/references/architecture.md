# Architecture Reference

Use this reference when a plan touches data model, API, frontend state, shared types, domain ownership, or cross-cutting infrastructure.

## Layers

- Shared DTOs and public API types live in `packages/shared-types`.
- API routes live in `apps/api/src/routes` and contain validation plus service calls, not business logic.
- Repositories live in `apps/api/src/repositories` when CRUD, versioning, or reusable persistence logic exists.
- Services live in `apps/api/src/services` and orchestrate business rules, relations, files, and cross-domain behavior.
- Web API calls live in `apps/web/src/api`.
- Server state lives in TanStack Query hooks and central query keys/invalidation.

## Data And Migration Rules

- Structural DB changes require `schema.ts`, a new migration, migration metadata, and a successful local migration.
- Versioned objects require `version`, `expectedVersion` on update, conflict handling, and tests using the current returned version.
- New application tables must be included in dump registry, test truncation, and dump roundtrip seed when they hold productive data.
- Use generated columns and SQLite-specific expressions only when they are explicitly part of the plan.

## Domain Orientation

- Project management: projects, milestones, tasks, subtasks, backlog.
- Documentation: features, use cases, wiki pages, relations.
- Tickets: tickets, ticket relations, ticket tags, ticket notes, owner joins.
- Cross-cutting infrastructure: tags, notes, attachments, comments, calendar, auth, roles, permissions.

## Frontend State Rules

- Use `ky` through `src/api/client.ts`.
- Use central query keys in `src/queries/queryKeys.ts`.
- Use central invalidation helpers in `src/queries/invalidation.ts`.
- Do not fetch server state through component `useEffect` chains.
- Add owner-based hook support consistently when a new owner-capable entity is introduced.
