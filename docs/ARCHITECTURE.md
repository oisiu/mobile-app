# Architecture

## Repository ownership

| Path | Responsibility |
| --- | --- |
| `app/` | Expo Router screens and navigation |
| `src/domain/` | Pure types, validation, tree rules, aggregation, and analytics |
| `src/data/` | SQLite schema, migrations, and repository operations |
| `src/features/` | UI coordination, shared components, and feature logic |
| `src/{i18n,theme,utils}/` | Application-wide support code |
| `tests/` | Automated mobile tests |

The repository root is the single Expo application and owns its manifest, lockfile, CI, and documentation. Runtime assets live in `assets/`; marketplace copy and artwork live in `store/`. Public policies and support pages are owned by the separate `oisiu/legal` repository. Do not scaffold empty future directories.

## Runtime boundaries

Current flow: **screens/components → AppProvider or HabitRepository → Expo SQLite**.

`HabitRepository` is the persistence and application-operation boundary; a separate use-case layer and repository interface are not yet implemented. SQL stays in `src/data/`. Domain code imports no React, Expo, SQLite, or Drizzle modules.

For the current single application, this concrete boundary keeps the codebase small. Before adding another UI client, alternative persistence, or complex cross-repository workflows, introduce an application/use-case layer and depend on repository interfaces rather than allowing screens to acquire new data-layer dependencies.

`AppProvider` opens and migrates the database without seeding habits, exposes habit/entry snapshots, and publishes both together after refresh reads complete. It centralizes daily-entry changes and transient success messages. Habit editors call repository operations and publish success after refresh.

The provider also resolves System/Light/Dark once for the app. The preference uses Expo SQLite key-value storage, separate from the product schema. Screens consume the resolved palette. The root holds the native splash until this preference has loaded, then applies the palette to its loading view and native root background. Expo SplashScreen configures device-themed launch colors; Expo SystemUI enables Android automatic appearance.

Drizzle declares the schema; explicit SQL migrations create and upgrade it. `HabitRepository.editTree` accepts updates, preorder creations with temporary parent keys, and staged deletions as one transaction. See [Database](DATABASE.md) for integrity guarantees.

The root shell renders one shared `AppBar` below its route stack; the nested Tabs navigator keeps screen state but hides its own bar. Footer destinations dismiss detail/editor stack routes back to the selected main screen. Existing `/insight/[id]` and `/habit/[id]` routes and Back behavior remain available.

## Rendering and analytics

Home uses a horizontal `Animated.ScrollView` only for the date header. Its native-driven offset translates clipped value tracks in a separate virtualized vertical habit list; labels stay outside the horizontal scroller. A bounded date window and spacers preserve the scroll extent. The visible date/value matrix is recomputed when scrolling settles rather than for every scroll event; display values are memoized and never persisted.

`domain/calendarExpansion.ts` selects the recorded branches to expand when a day sheet opens, including their ancestors and hidden General records.

The Calendar tab virtualizes month grids in a native vertical list. The Insight activity calendar uses native horizontal scrolling with history prepending. Their interaction rules belong in [UI and UX](UI_UX.md).

`domain/aggregation.ts` builds a weakly cached hierarchy/entry index for each immutable provider snapshot. Repeated Home, Calendar, and Insights calculations reuse leaf, habit/date value, activity, and record-presence lookups without persisting derived data. `domain/insightsOverview.ts` computes week/month root rankings and elapsed-day denominators.

Main screens prefetch reachable routes. Insight detail defers chart rendering until its opening transition ends, with a fallback for direct launches. Score and Calendar render first; lower sections load as scrolling approaches them. Reveals respect Reduce Motion. Dialog drafts and pending-write state stay local to avoid re-rendering background charts; committed data refreshes still update them. Score comparison inputs are memoized. Calendar grids, day-sheet rows, and Insight calendar weeks use virtualized lists; the larger calendar starts at the selected week.

`domain/analytics.ts` owns common calendar periods and streaks. `domain/habitStrength.ts` computes daily exponential habit strength and calendar-bucket averages without persisted aggregates. `domain/history.ts` computes History ranges, totals, and rounded axes; `domain/frequency.ts` computes full-month weekday frequencies. Feature components coordinate filters and render the results with native views and `react-native-svg`.
