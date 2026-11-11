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

The root owns the single Expo app, manifest, lockfile, CI, and documentation. Runtime assets live in `assets/`, marketplace material in `store/`, and public policies/support in the separate `oisiu/legal` repository. Do not scaffold empty future directories.

## Runtime boundaries

Current flow: **screens/components → AppProvider or HabitRepository → Expo SQLite**.

- **Persistence:** `HabitRepository` is the persistence and application-operation boundary. SQL stays in `src/data/`; domain code imports no React, Expo, SQLite, or Drizzle modules. Drizzle declares schema; explicit SQL migrations upgrade it. `data/habitRows.ts` owns row mapping, habit inserts, sibling normalization, and the General-child transitions shared by the repository and hierarchy saves.
- **Hierarchy saves:** `data/treeWrites.ts` owns one transaction covering updates, preorder creations with temporary parent keys, staged deletions, attachments, historical conversions, and final sibling order (`data/treeOrder.ts`, planned by the pure `domain/siblingOrder.ts`). `domain/treeAttachments.ts` validates attachments; `domain/habitTypeChange.ts` plans conversions. [Database](DATABASE.md) owns integrity guarantees.
- **Snapshots:** `AppProvider` opens/migrates SQLite and publishes habit/entry snapshots together in one state update. Refresh requests run in order, so older reads cannot overwrite newer publications; a failed request does not block later ones. Readiness requires the initial snapshot; failed startup connections close before a guarded retry.
- **Write recovery:** a committed write whose refresh fails retries publication only, never the write. `useEntryWrites` and `useHabitMutation` provide this for entries and the habit editor; the Home, Calendar, and Insights day editors share it through `features/useRetryableEntryWrite.ts`. More guards imports from picking through publication against overlapping transfers/deletion. Navigation guards repeated pushes until focus returns.
- **Appearance:** System/Light/Dark lives in separate Expo SQLite key-value storage. Serialized writes preserve selection order; a failed latest write restores the saved mode; read failures use System. The native splash stays until the ready/recovery layout; see [Startup](UI_UX.md#startup).
- **Moving habits:** `features/MoveHabitButton.tsx` lists destinations from the pure `domain/moveDestinations.ts` and commits through `HabitRepository.move`. The habit editor no longer stages moves; the `moves` argument of hierarchy saves is unused by the app.
- **Navigation:** the root renders one `AppBar` below the route stack; nested Tabs hide their own bar. Detail/editor routes are `/insight/[id]` and `/habit/[id]`.
- **Popovers:** `features/AnchoredPopover.tsx` handles trigger measurement, safe-area bounds, and the keyboard; callers own selection, drafts, and write guards.

## Rendering and analytics

Display values are derived and memoized, never persisted. Constraints that are easy to break:

- **Home:** the horizontal `Animated.ScrollView` holds only the date header; its native offset translates clipped value tracks in a separate virtualized habit list, so labels stay fixed. `home/useHomeDates` keeps a bounded mounted window of 20-day chunks, two behind and three ahead of the visible one; `HomeDayCells` memoizes each chunk, so a window shift mounts only the entering chunk and a fast fling cannot outrun rendering. Keep native subview clipping disabled on the habit list so translated tracks remain attached. Category dragging cancels when the hierarchy changes.
- **Calendars:** month grids virtualize vertically; Insight activity weeks scroll horizontally with history prepending. Keep the initial scroll index fixed for the mounted timeline and native subview clipping disabled so prepended weeks remain attached.
- **Chart timelines:** Consistency and History draw as fixed-width SVG tiles (`insights/timelineTiles.ts`) and mount only those near the viewport. Android rasterizes each SVG into one bitmap and crashes above 100 MB, so never draw a history-length SVG.
- **Aggregation:** `domain/aggregation.ts` weakly caches hierarchy, leaf, value, activity, and record-presence indexes per immutable snapshot. `domain/insightsOverview.ts` and Home’s bulk daily aggregation reuse them. Archived roots’ children are not promoted.
- **Insight detail:** charts defer until the opening transition ends, with a direct-launch fallback; Consistency/Calendar load first and lower sections mount near the viewport. [Insights](UI_UX.md#insights) owns loading presentation.
- **Shared chart pieces:** `features/useRevealAnimation.ts` owns the Reduce Motion-aware reveal used by the Consistency line and calendar fills; `insights/chartShared.ts` owns highlight dimming and year/month label rules.
- **Trees:** `domain/tree.ts` traversal and sorting are iterative, so deep hierarchies cannot overflow the stack.
- **Habit appearance:** `domain/habitAppearance.ts` owns emoji validation and nearest-ancestor color inheritance; palette values live in `theme/habitColors.ts`. Only explicit color choices are persisted.
- **Activity mode:** `domain/booleanAnalysis.ts` derives an immutable Activity snapshot for quantity/duration Calendar, History, streaks, and Frequency. Consistency and threshold intensity use original values.
- **Thresholds:** `domain/calendarThreshold.ts` validates per-habit thresholds and derives fill intensity; only the preference is persisted.

Analytics ownership:

| Module | Responsibility |
| --- | --- |
| `domain/analytics.ts` | Calendar periods and all-history streaks through today |
| `domain/chartTimeline.ts` | Detail Day/Week/Month/Quarter/Year buckets |
| `domain/habitStrength.ts` | Daily exponential strength and bucket averages |
| `domain/history.ts` | History totals and axes |
| `domain/frequency.ts` | Annual weekday frequencies using elapsed-date denominators |
| `features/insights/historyLayout.ts` | History bar/label spacing and fixed-axis overflow |
| `features/insights/useCalendarNavigation.ts` | Measured calendar positioning, overlapping history-request guards, and bounded month navigation |
| `features/insights/useTimelineScroll.ts` | Concurrent history-request guards; viewport preserved on prepends |

Feature components render derived results with native views and `react-native-svg`.

## Visibility

- Root-only overview visibility excludes categories from general rankings/comparisons while retaining tree and individual analytics.
- `domain/habitVisibility.ts` removes completely hidden branches/entries from Calendar and Insights display snapshots. The provider/repository keep complete data for exports, editing, and More’s recovery list.
- Home’s revealed hidden-habit list passes an explicit detail-route flag that exempts only that root from the detail snapshot’s hiding filter, without changing saved visibility. `home/useHiddenCategoriesReveal` holds that temporary state.
- `HabitRepository.setHidden` plus refresh restores a root; descendants inherit visibility without stored flags.

## Settings and localization

The Settings tab re-exports `settings/SettingsScreen`. `useSettingsData` owns the shared operation guards, confirmation order, and refresh recovery; `transferCache` owns transfer-file cleanup.

`i18n/index.ts` owns locale selection and interpolation. Message groups under `i18n/messages/` keep English and Spanish together; the catalog enforces the English key set for Spanish.
