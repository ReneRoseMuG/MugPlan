# Auth And Roles Reference

Use this reference for every plan that touches API routes, web workflows, navigation, admin functions, protected data, or new domains.

## Binding Decisions

- Auth, roles, and permissions are cross-cutting infrastructure.
- New API routes are authenticated by default.
- Public exceptions must be named and justified in the plan.
- Current public exceptions are `/health`, `/api/health`, and `/api/auth/*`, unless a later task changes that.
- The API is the security boundary. Frontend gating is only user experience support.

## Permission Mapping

- Read-only endpoints require `read`.
- Create and update endpoints require `write`.
- Delete endpoints require `delete`.
- Admin endpoints require specific admin permissions, such as `users:admin` or `roles:admin`.
- New admin areas need clearly named admin permissions.
- New domains or larger support objects need permission catalog entries when users can read, write, delete, or administer them.

## Required Planning Checks

- Which roles can see the navigation entry?
- Which roles can call each API route?
- Which buttons or actions are hidden, disabled, or forbidden in the UI?
- Which 401 and 403 paths exist?
- Does a custom role need to be tested?
- Does seed data or the permission catalog need to change?

## Required Tests

- Successful access with an authorized user.
- Rejected access without a session when the route is protected.
- Rejected access with a user lacking the required permission.
- Reader-negative case for write or delete workflows.
- Admin/custom-role case for admin or permission-specific behavior.
