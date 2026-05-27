# Acceptance Criteria Reference

Use this reference before finalizing a plan or calling a change complete.

## Definition Of Done

- The planned scope is implemented or blockers are documented.
- No unrelated refactors or scope expansions were introduced.
- Required migrations, seed changes, fixtures, dumps, and shared types are included.
- Auth, roles, and permission effects are implemented and tested when affected.
- Frontend state, invalidation, and navigation are consistent with the change.
- Required tests were added or the missing test coverage is documented as a blocker.
- Step logs exist for class 4 and class 5 changes.
- The final response names tests/audits run and known deviations.

## Plan Acceptance

A plan is acceptable when a reviewer can see:

- What will change.
- Why each affected layer is touched.
- Which workflows are affected or intentionally untouched.
- Which risks matter most.
- How the change will be verified.

## Completion Reporting

Report concise German results:

- Main outcome.
- Key files or areas changed.
- Tests or audit commands run.
- Open risks, blockers, or known lint/build/test failures.
