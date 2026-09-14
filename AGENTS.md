# Oisiu agent guide

Read the relevant document from the [README index](README.md#documentation) before changing the project.

## Rules

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

## Layout

- `app/`: Expo Router screens only
- `src/domain/`: pure rules and types
- `src/data/`: schema, migrations, and repositories
- `src/features/`: use cases and UI
- `src/{i18n,theme,utils}/`: shared app concerns
- `tests/`: automated tests
- `assets/`: runtime/build assets
- `store/`: marketplace material

## Before handoff

Run `pnpm run doctor`, `pnpm verify`, `pnpm test`, `pnpm run audit`, `pnpm build`, and `git diff --check`. Report unresolved failures and unperformed native checks in the handoff.
