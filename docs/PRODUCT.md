# Product

## Purpose and boundaries

oisiu records Boolean, decimal-number, and duration habits by local day. It works without accounts, a backend, telemetry, or a network connection. Exporting or sharing data is an explicit user action.

Oisiu targets Android and iOS. It excludes web, cloud sync, timers, event streams, historical hierarchy, built-in AI, and gamification.

## Habit rules

New root categories default to Boolean (Yes/No); quantity and duration are explicit alternatives. Individual quantity/duration analysis can switch to a derived Boolean view, where any stored record (including zero) counts as activity once per date across a branch. Original values remain unchanged.

New installations start empty. Users add their own habits from Home or import their data from More.

- Habits may have one optional emoji and a palette color. Children inherit the nearest ancestor’s color unless overridden. Legacy emoji strings remain intact until the emoji is changed.
- Habits form a tree with stable stored sibling order, arbitrary depth, and one value type per branch. Home supports dragging root categories into a new saved order.
- Each leaf has at most one effective value per day. Past dates are editable; future dates are rejected. Number/duration saves replace the daily total; Boolean input toggles activity. Home supports reviewing branch records and moving them to another past/current day; destination conflicts block the move without overwriting.
- Parent totals use the current hierarchy: Boolean OR, number SUM, and duration-seconds SUM. Direct parent input belongs to its hidden General child, separate from descendant records.
- Existing compatible categories, including roots and descendants of other roots, can be regrouped under new or existing categories in the hierarchy editor while preserving their records and descendants. Changes apply together on Save.
- Complete root-category hiding preserves entries while excluding the branch from main Home, Calendar, and all Insights. Hidden categories in More → Data supports editing and recovery; a three-second hold on the Oi Siu title in Today also toggles this section below the list. Hiding is configured in the root editor.
- Root categories can be hidden from general Analysis without archiving them. They remain in Today with their records and individual analysis; children cannot be hidden independently.
- Root editing can permanently change the type of the whole category and its descendants after a historical-conversion warning. Boolean Yes records receive a chosen quantity/duration; numerical records become Boolean activity by record presence. Quantity and duration convert proportionally using a user-supplied duration per quantity unit. Missing dates remain empty.
- Editing a descendant opens its root's hierarchy editor. New descendants inherit the root type. Archive preserves history; confirmed deletion removes the subtree and its records.

Persistence and transition details belong in [Database](DATABASE.md).

## Screens

| Screen | Purpose |
| --- | --- |
| Home | Record daily values, browse history, expand groups, and open habit Insights |
| Calendar | Browse months and edit a selected day's records across the habit tree |
| Insights | Browse weekly, monthly, or yearly category contributions, active days, Consistency curves, and History; open individual habits for detailed analysis |
| More | Choose appearance and import/export data |

Insights describes recorded patterns without causal claims. Consistency tracks gradually changing habit strength from daily branch activity across all types; History shows one stacked bar per period. Comparisons avoid duplicate parent/child contributions and count Boolean activity by unique date. Detailed controls and chart definitions are in [UI and UX](UI_UX.md).

## Data portability

JSON supports additive safe merge; CSV provides a flat export. More can export all habits or one root category with all descendants and its full recorded history, including hidden and archived habits. More also offers a copyable guide for converting another app's export with an external AI service. The user chooses that service and shares any source data independently; oisiu does not contact it. The import contract remains the same for manually prepared and externally converted files; see [Database](DATABASE.md#import-and-export).
