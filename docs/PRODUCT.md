# Product

## Purpose and boundaries

oisiu records Boolean, decimal-number, and duration habits by local day. It works without accounts, a backend, telemetry, or a network connection. Exporting or sharing data is an explicit user action.

Oisiu targets Android and iOS. It excludes web, cloud sync, timers, event streams, historical hierarchy, built-in AI, and gamification.

## Habit rules

New installations start empty. Users add their own habits from Home or import their data from Settings.

- Habits form a tree with stable stored sibling order, arbitrary depth, and one value type per branch. The UI does not expose reordering.
- Each leaf has at most one effective value per day. Past dates are editable; future dates are rejected. Number/duration saves replace the daily total; Boolean input toggles activity. Home supports reviewing branch records and moving them to another past/current day; destination conflicts block the move without overwriting.
- Parent totals use the current hierarchy: Boolean OR, number SUM, and duration-seconds SUM. Direct parent input belongs to its hidden General child, separate from descendant records.
- Editing a descendant opens its root's hierarchy editor. New descendants inherit the root type. Archive preserves history; confirmed deletion removes the subtree and its records.

Persistence and transition details belong in [Database](DATABASE.md).

## Screens

| Screen | Purpose |
| --- | --- |
| Home | Record daily values, browse history, expand groups, and open habit Insights |
| Calendar | Browse months and edit a selected day's records across the habit tree |
| Insights | Rank active root habits for the current week or month through today and explore Score, Calendar, History, streaks, and Frequency |
| Settings | Choose appearance and import/export data |

Insights describes recorded patterns without causal claims. Score tracks gradually changing habit strength from daily branch activity across all types; History shows one stacked bar per period. Comparisons avoid duplicate parent/child contributions and count Boolean activity by unique date. Detailed controls and chart definitions are in [UI and UX](UI_UX.md).

## Data portability

Complete JSON supports additive safe merge; CSV provides a flat export. Settings also offers a copyable guide for converting another app's export with an external AI service. The user chooses that service and shares any source data independently; oisiu does not contact it. The import contract remains the same for manually prepared and externally converted files; see [Database](DATABASE.md#import-and-export).
