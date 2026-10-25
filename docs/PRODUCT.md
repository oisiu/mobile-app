# Product

## Purpose and boundaries

oisiu records Boolean, decimal-number, and duration habits by local day. It works without accounts, a backend, telemetry, or a network connection. Exporting or sharing data is an explicit user action.

Oisiu targets Android and iOS. It excludes web, cloud sync, timers, event streams, historical hierarchy, built-in AI, and gamification.

## Habit rules

New roots default to Boolean (Yes/No); quantity and duration are alternatives. Their optional Activity analysis counts any stored record, including zero, once per branch/date without changing original values.

New installations start empty. Users add their own habits from Home or import their data from More.

- Habits form homogeneous trees of arbitrary depth with saved sibling order; Home supports root reordering.
- Optional emoji and palette colors identify habits. Children inherit the nearest ancestor’s color unless overridden; unchanged legacy emojis remain valid.
- Each leaf has at most one value per local day. Past/current dates are editable; future dates are rejected. Boolean input toggles activity; quantity/duration saves replace the daily total.
- Parent totals use the current hierarchy: Boolean OR, quantity SUM, duration-seconds SUM. Direct parent input belongs to a hidden General child.
- Hierarchy saves can regroup compatible categories and their complete subtrees without losing records. Descendant editing opens the root editor; new children inherit its type.
- Branch records can move to another past/current date; destination conflicts reject the move without overwriting.
- Root preferences independently hide a branch from general analysis or all main screens. Hidden categories remain recoverable in More and through Home’s temporary reveal; see [Category visibility](UI_UX.md#category-visibility).
- Root editing can permanently convert a whole branch’s type after a historical-conversion warning; missing dates remain empty.
- Archive preserves history; confirmed deletion removes the subtree and records.

Persistence and transition details belong in [Database](DATABASE.md).

## Screens

| Screen | Purpose |
| --- | --- |
| Home | Record daily values, browse history, expand groups, and open habit Insights |
| Calendar | Browse months and edit a selected day's records across the habit tree |
| Insights | Browse weekly, monthly, or yearly category contributions, active days, Consistency curves, and History; open individual habits for detailed analysis |
| More | Choose appearance and import/export data |

Insights describes recorded patterns without causal claims. Consistency tracks habit strength; History shows stacked period totals. Comparisons deduplicate parent/child records and Boolean dates. [UI and UX](UI_UX.md#insights) defines charts and controls.

## Data portability

JSON supports safe additive merge; CSV provides a flat export. Export all habits or selected roots with complete descendant history, including hidden and archived habits. The optional AI conversion guide runs outside Oisiu: users choose the service and share source data themselves. All imports follow the same [transfer contract](DATABASE.md#import-and-export).