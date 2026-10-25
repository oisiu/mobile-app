# Database

## Schema and values

Enable foreign keys. Native IDs are UUIDs; import IDs must be unique and resolve in-document. Validate real local `YYYY-MM-DD` dates, including leap years. Entries also store occurrence time, timezone, and creation/update timestamps.

| Table | Main fields and constraints |
| --- | --- |
| `schema_versions` | Applied migration version and timestamp |
| `habits` | Text primary key; cascading nullable `parent_id`; name, emoji, nullable color and `calendar_threshold`, type, integer `sort_order`, `is_general`, root-only `hide_from_overview` and `is_hidden` (0/1, default 0), `archived_at`, timestamps; index on parent/order |
| `entries` | Text primary key; cascading `habit_id`; value, occurrence/local date/timezone, timestamps; unique habit/day; date index |

Values are Boolean (0/1), non-negative decimal quantity, or non-negative safe-integer duration seconds. Never store aggregates. Optional Activity analysis derives record presence, including zero, without changing stored data. Direct parent input uses a canonical hidden General child.

## Transactions and integrity

- Branch edits transactionally validate the complete reviewed leaf snapshot, including zero, then update retained values, delete disabled records, and optionally move dates. Destination conflicts, stale records, invalid input, or write failures reject the whole operation. Moves preserve IDs, occurrence/timezone/creation metadata; only local date and update time change.
- New/renamed names allow 1–25 trimmed Unicode code points. Unchanged/imported legacy names remain intact. Deletion counts exclude General identities, not their records.
- Keep trees acyclic/homogeneous. Normalize affected non-General sibling order to `0..n-1`; General uses `-1`.
- First real child moves leaf records to General; last-child removal moves them back. Moves apply these transitions to both parents, preserve metadata, and clear attached roots’ root-only flags. Reject moves of General, children under General/archived parents, and archived destinations. Validate child creation transactionally. Same-parent reorder preserves timestamps.
- Hierarchy save atomically batches renames, preorder insertions, staged deletions, attachments, General transitions, and final order normalization. Resolve temporary parents before inserts; new descendants inherit root type. Validate new/attachment positions and apply after structural writes; ordering errors roll back. New-root creation uses the same transaction.
- Attachments validate compatible active, non-overlapping subtrees, expected source parents, and acyclicity against the transactional snapshot. Preserve IDs, records, descendants, colors, and thresholds. Attached roots clear root-only flags and inherit destination visibility; normalize both sibling groups.
- Type conversion validates source type, exact original branch membership (including General/archived descendants), and reviewed entry metadata in the hierarchy transaction. Boolean Yes becomes a chosen non-negative quantity/integer-second duration; No stays zero and missing dates remain empty. Quantity/duration → Boolean maps every record, including zero, to 1. Quantity ↔ Duration uses integer seconds per quantity unit, multiplying/dividing and rounding duration to whole seconds; reject non-finite/unsafe results.
- Conversion clears original thresholds before applying target draft settings. Preserve IDs, hierarchy/order, archives, colors, occurrence/local-date/timezone/creation metadata; changed types/values receive update timestamps. Do not reconvert newly attached target-type branches. Any failure rolls back conversion and hierarchy changes.
- Archive/restore preserves subtree records/order. Delete cascades through descendants/entries and normalizes remaining siblings.

Delete all habit data transactionally removes entries/habits while retaining migration history and appearance. Failure rolls back both deletes; successful refresh publishes empty snapshots. UI cache cleanup is described [below](#import-and-export).

## Migrations and initial data

| Version | Change |
| --- | --- |
| 1 | Creates habits, entries, indexes, and daily uniqueness |
| 2 | Expands a matching legacy numeric leaf into children and moves its existing records to General atomically |
| 3 | Adds nullable palette color; existing habits inherit/default without changing emojis or records |
| 4 | Expands the color constraint to twelve choices, copying existing colors while preserving habit IDs, hierarchy, order, and entries |
| 5 | Adds root-only overview visibility, defaulting all existing habits to visible without changing records |
| 6 | Adds complete root-category hiding, defaulting existing categories to visible and preserving records and overview-only preferences |
| 7 | Adds nullable per-habit calendar color thresholds; existing habits retain their usual calendar colors and records |

Version 2 matches legacy attributes and skips changed/already-expanded structures. Never edit released migrations; add a version with documented upgrade behavior.

New databases start empty; startup never seeds samples, including after deletion. Upgrades preserve existing data.

## Import and export

JSON version 1 contains `version`, `exportedAt`, `habits`, and `entries`, including `sortOrder`. [Types](../src/domain/types.ts) and [validation](../src/domain/import.ts) own field definitions. Older version-1 files and legacy emoji strings remain supported.

| Optional preference | Validation and identity |
| --- | --- |
| `isHidden`, `hideFromOverview` | Boolean; absent equals false/visible. True requires a non-General root. |
| `color` | Supported palette key; absent/null means Automatic. Unknown keys or conflicting existing identities reject merge. |
| `calendarThreshold` | Finite positive quantity or integer duration seconds; forbidden for Boolean/General. Absent equals null/no rule. |

Exports/merges preserve these preferences; all participate in identity comparison.

Reject files above 5 MiB before parsing. Validate field shapes, IDs/references, types, dates/values, acyclic homogeneous trees, unique habit/day entries, and unique non-negative non-General sibling orders. Branches require exactly one childless General at `-1`, never root or sole child; entries belong to leaves. Timestamp/timezone strings remain uninterpreted.

Merge compares identity independent of JSON key order, excluding existing sibling order. Preserve existing positions; append new siblings in incoming order. Conflicting identities, daily keys, or General structures abort. When a leaf gains children, transfer records/metadata to General; daily conflicts reject the transaction. Validate the combined result with inserts/transfers atomically, resolving parents regardless of file order. Never overwrite/delete recorded values. AI conversion guidance does not replace validation.

CSV includes entry ID, local date, timezone, type, value, and current full habit path; escape commas, quotes, and line breaks. More exports all habits by default or selected roots with all descendants (General/archived included) and history. Preserve IDs, hierarchy, order, preferences, and timestamps so scoped JSON remains importable; export no aggregates.

Imports copy files to app cache; exports write plaintext JSON/CSV before system sharing. Clear stale exports/DocumentPicker cache before transfers. Remove import copies before confirmation, including cancellation/read/validation failures, and exports after native sharing settles, including failures. Delete all data clears these caches before database deletion. Cleanup failure shows localized errors, never success. Original imports and external shared copies remain at their source/destination.