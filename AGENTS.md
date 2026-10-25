# Oisiu agent guide

Read the relevant document from the [README index](README.md#documentation) before changing the project.

## Rules

- Use English for technical documentation, code identifiers, comments, test descriptions, and tooling messages. Keep supported translations and localization fixtures in their target languages.
- Preserve local-first privacy: no backend, accounts, telemetry, or required network access.
- Update English and Spanish whenever user-facing text, accessibility labels, or dialogs change.
- Keep domain rules independent from React, Expo, SQLite, and Drizzle.
- Keep SQL in `src/data/`; UI code uses repository operations rather than SQL.
- Preserve acyclic homogeneous habit trees, entries, and sequential sibling order.
- Use transactions for multi-row mutations and never persist aggregates.
- Do not edit released migrations; add a new migration.
- Use the pnpm version pinned in `package.json`. Add Expo-managed packages with `pnpm expo install`.
- Preserve unrelated working-tree changes and keep generated native/build files out of Git.
- Update the document that owns a changed fact; avoid chronological task logs.

## Before handoff

Run `pnpm run doctor`, `pnpm verify`, `pnpm test`, `pnpm run audit`, `pnpm build`, and `git diff --check`. Report unresolved failures and unperformed native checks in the handoff.
