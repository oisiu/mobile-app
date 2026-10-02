# Database

## Schema and values

Foreign keys are enabled. Native-created IDs are UUIDs; imported IDs must be unique and resolve within the document. Dates use local `YYYY-MM-DD`; records also store an occurrence timestamp, timezone, and creation/update timestamps.

| Table | Main fields and constraints |
| --- | --- |
| `schema_versions` | Applied migration version and timestamp |
| `habits` | Text primary key; cascading nullable `parent_id`; name, emoji, nullable color, type, integer `sort_order`, `is_general`, `archived_at`, timestamps; index on parent/order |
| `entries` | Text primary key; cascading `habit_id`; value, occurrence/local date/timezone, timestamps; unique habit/day; date index |

Types are Boolean (0/1), number (non-negative decimal), and duration (non-negative integer seconds). Aggregates are calculated, never stored. Direct parent records use a canonical hidden General child.

## Transactions and integrity

- Home branch edits validate the complete reviewed leaf-record snapshot, including zero, inside a transaction. Retained values are updated, switched-off entries deleted, and optional date moves applied together. Existing destination records for a moved habit cause rejection even when their value is zero. Source changes, invalid values/dates, or write failures prevent partial writes. Moves preserve entry IDs, original occurrence timestamps, timezones, and creation timestamps; local date and updated timestamp change. Summaries remain derived.
- Structural changes maintain an acyclic, homogeneous tree. Affected non-General sibling groups are normalized to `0..n-1`; General uses order `-1`.
- Adding the first real child moves leaf records to General; removing the last real child moves them back. These transitions are transactional.
- A hierarchy save batches renames, preorder insertions, staged subtree deletions, order normalization, and required General transitions. Temporary parent keys are resolved before insertion; new descendants use the root type.
- Archive/restore applies to the subtree and preserves stored order. Delete cascades through descendants/entries and normalizes the remaining siblings.

## Migrations and initial data

| Version | Change |
| --- | --- |
| 1 | Creates habits, entries, indexes, and daily uniqueness |
| 2 | Expands a matching legacy numeric leaf into children and moves its existing records to General atomically |
| 3 | Adds nullable palette color; existing habits inherit/default without changing emojis or records |
| 4 | Expands the color constraint to twelve choices, copying existing colors while preserving habit IDs, hierarchy, order, and entries |

Version 2 matches legacy attributes and skips already-expanded or changed structures. Released migrations must not be edited; add a new version and document its upgrade behavior.

New databases start with no habits or entries. Startup runs the released migrations but does not seed sample data, including after a user deletes all habits. Existing saved habits and records (including previous sample habits) are retained; this change needs no schema migration.

## Import and export

JSON version 1 contains `version`, `exportedAt`, `habits`, and `entries`, including `sortOrder` and optional `color` (null/absent for automatic, otherwise a supported palette key). Older version-1 files remain supported; exports preserve chosen colors. Unknown color keys and changes to existing color identities reject the merge. Legacy emoji strings remain importable. [Domain types](../src/domain/types.ts) define the fields; [import validation](../src/domain/import.ts) defines accepted input.

The file reader rejects imports above 5 MiB before parsing. Validation checks IDs/references, supported types, local dates/values, acyclic homogeneous trees, unique habit/day entries, and non-negative unique non-General sibling order. Every branch must have exactly one childless General child at order -1; General cannot be a root or the only child. Entries must belong to leaves. Metadata validation remains partial.

Merge compares identity fields independent of JSON key order, preserving existing sibling positions and appending new siblings in incoming order. Existing habit identity comparisons exclude sibling order so repeated imports remain safe after appending. Conflicting identities, daily keys, or combined General structures abort the import. When an existing leaf gains children, its records move to General with IDs and metadata preserved; destination daily conflicts reject the entire merge. The combined result is validated inside the same transaction as inserts and transfers. File arrays need not place parents before children; persistence resolves parent order. No recorded values are overwritten or deleted. The UI's AI conversion prompt is guidance, not a replacement for validation.

CSV contains entry ID, local date, timezone, type, value, and the current full habit path. Export creation and system sharing live in Settings.
