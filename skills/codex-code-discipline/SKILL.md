---
name: codex-code-discipline
description: Use at the start of every coding or implementation task before editing files. Provides discipline rules that prevent common Codex regressions: removing existing UI elements, breaking event wiring, reverting valid code because a specification is stale, or causing unintended side effects in adjacent components, styles, services, and callers. Apply especially when touching UI components, CSS or styling, event handlers, service methods, shared logic, or files near existing behavior.
---

# Coding Task Discipline

Use this skill before writing code for an implementation task. These principles protect existing behavior while making the requested change.

## Principle 1: Scan Before You Touch

Before modifying any file, read the relevant parts of the existing code.

- Read the whole component or module you are entering and understand what it does today.
- Identify every UI element currently present: buttons, inputs, icons, event handlers, conditional renders.
- For CSS or style changes, identify which other components share the same class names, stylesheets, or parent selectors.
- For service or logic changes, find which other callers depend on the function or method you are modifying.

Build a complete model of the current state before changing it. A change you did not anticipate is a change you can break by accident.

## Principle 2: Code Is the Source of Truth

If a background specification and the existing code contradict each other, treat the code as the current truth unless the work order explicitly says otherwise.

- Do not revert working, intentional code just because a spec document describes something different.
- If you notice a discrepancy between spec and code, flag it as an observation instead of silently "fixing" it.
- If the work order explicitly asks you to align code with a specific spec requirement, the work order is authoritative for that task.

When in doubt, leave working code alone unless the requested change requires touching it.

## Principle 3: Predict the Impact Before You Start

Before implementing, think through what the change could affect.

- Which other files will be affected directly or indirectly?
- Does this CSS change apply to a shared class, and could it shift layout, overflow, or z-index elsewhere?
- Does this function change affect other callers or their assumptions about return values and side effects?
- Is the component embedded inside other components that depend on its structure?

Write the impact analysis down only when it is complex, but always do the thinking before the edit.

## Principle 4: Change Only What the Task Requires

Keep the scope to the task you were given.

- Do not refactor adjacent code that is merely cleaner another way.
- Do not rename things that are not broken.
- Do not reorganize files that are outside the request.
- If a side change is necessary for the task to work, state what you are doing and why it is required.

Every out-of-scope change can break something unrequested and makes the diff harder to review.

## Principle 5: Preservation Checklist Before Finishing

After implementing, run this checklist before declaring the task done.

### UI Changes

- Are all buttons, inputs, and interactive elements that existed before still present and functional?
- Are all event handlers still correctly wired?
- Does the layout still work without unintended overflow or overlapping components?
- Does the style change stay contained to the intended scope?

### Logic Or Service Changes

- Do all existing callers of the changed function or method still work with the new signature or behavior?
- Are all previously valid states still handled correctly?
- Did you remove anything that another part of the system might still depend on?

### General

- Did you make any change outside the explicitly required scope? If yes, is it necessary and stated?
- Did you remove or replace code that was intentional and might be missed?

If you find a problem during the checklist, fix it before finishing unless the work order explicitly permits leaving it open.

## Summary

| Principle | Rule in one line |
|---|---|
| Scan first | Read what exists before you change it. |
| Code over spec | Working code beats an outdated background document. |
| Predict impact | Think through side effects before editing. |
| Minimal scope | Change only what the task requires. |
| Preservation check | Verify existing behavior was not removed or broken. |
