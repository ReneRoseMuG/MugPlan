# Git Workflow Reference

Use this reference for branch, save, merge, push, or cleanup planning.

## General Rules

- Run git commands serially.
- Do not touch `main` unless the user explicitly asks.
- Do not revert unrelated changes unless the user explicitly asks.
- Check `git status --short --branch` before branch or save operations.
- Preserve dirty user work and call it out when it affects the task.

## Branch Commands

- `branch <name>`: create a branch from `main`, set remote tracking, push immediately.
- `save`: stage all open changes, commit with a sensible imperative English message, and push the current branch.
- `savetowork`: save current branch, merge it into `work`, verify that `work` contains the changes, push `work`, then ask for explicit confirmation before deleting the source branch locally and remotely.

## Verification For `savetowork`

Before deleting the source branch, verify:

- `work` exists locally and on remote.
- `work` contains the source branch tip.
- `git status` is clean.
- The intended branch names for deletion are shown to the user.
- The user explicitly confirms deletion.
