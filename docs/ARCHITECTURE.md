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

`HabitRepository` is the persistence and application-operation boundary. SQL stays in `src/data/`. Domain code imports no React, Expo, SQLite, or Drizzle modules.

`AppProvider` opens/migrates SQLite and publishes habit/entry snapshots together. Readiness requires the initial snapshot. Failed startup connections close before guarded retry; appearance-read failures use System.

Entry operations retain request completion state until publication succeeds. Committed retries refresh without repeating writes or revalidating moved records. Direct-entry forms lock committed drafts; `useHabitMutation` provides equivalent habit-editor recovery. Write failures remain retryable; success publishes localized feedback. More guards imports from picking through publication against duplicate or overlapping transfers/deletion. Navigation guards repeated pushes until focus returns and clears canceled animation frames.

The provider resolves System/Light/Dark through separate Expo SQLite key-value storage. Serialized writes preserve selection order; a failed latest write restores the saved mode with retry guidance. The root, navigation ThemeProvider, stack content, and tab scenes share the resolved palette. Native SplashScreen stays until ready/recovery layout; pending retries retain recovery. SystemUI enables Android automatic appearance. See [Startup](UI_UX.md#startup) for presentation.

Drizzle declares schema; explicit SQL migrations upgrade it. `HabitRepository.editTree` commits updates, preorder creations with temporary parent keys, staged deletions, attachments, and historical conversions atomically. `createTree` adds a new root in the same transaction. `domain/treeAttachments.ts` validates attachments; `domain/habitTypeChange.ts` plans conversions. [Database](DATABASE.md) owns integrity guarantees.

The root renders one `AppBar` below the route stack. Nested Tabs retain state with their own bar hidden; footer destinations dismiss detail/editor routes to the selected main screen. Detail/editor routes are `/insight/[id]` and `/habit/[id]`.

`features/AnchoredPopover.tsx` provides native modal presentation for selectors, day editing, attachments, exports, and conversion guidance. It measures triggers, constrains panels to safe areas, and handles the keyboard; callers own selection, drafts, and write guards.

## Rendering and analytics

Home’s horizontal `Animated.ScrollView` holds only the date header. Its native offset translates clipped value tracks in a separate virtualized habit list, leaving labels fixed. Bounded dates/spacers preserve scroll extent; the matrix updates when scrolling settles. Display values are memoized, never persisted.

Calendar day expansion is local, resets to collapsed roots on opening, and reveals one level per arrow. Month grids use vertical virtualization; Insight activity weeks scroll horizontally with history prepending. [UI and UX](UI_UX.md) owns interactions.


`domain/aggregation.ts` weakly caches hierarchy, leaf, habit/date value, activity, and record-presence indexes per immutable snapshot. `domain/insightsOverview.ts` reuses them for root rankings, elapsed-day denominators, and comparison series; archived roots’ children are not promoted. Memoized windows, selections, and series avoid recalculation when filters open.

Main screens prefetch routes. Insight detail defers charts until the opening transition ends, with a direct-launch fallback; Consistency/Calendar load first and lower sections mount near the viewport. Reveals respect Reduce Motion. Removed/archived selections reconcile to the opened root when necessary. Dialog drafts/write state stay local; committed refreshes update charts. Calendar grids, day rows, and Insight weeks are virtualized; enlarged calendars start at the selected week.

`domain/habitAppearance.ts` owns emoji validation and nearest-ancestor color inheritance. Palette values and display accents live in `theme/habitColors.ts`; only explicit color choices are persisted.

`domain/booleanAnalysis.ts` derives an immutable Activity snapshot for quantity/duration Calendar, History, streaks, and Frequency. Consistency and threshold intensity use original values; calendar writes retain original types/values.

Analytics ownership:

| Module | Responsibility |
| --- | --- |
| `domain/analytics.ts` | Calendar periods and all-history streaks through today |
| `domain/chartTimeline.ts` | Detail Day/Week/Month/Quarter/Year buckets |
| `domain/habitStrength.ts` | Daily exponential strength and bucket averages |
| `domain/history.ts` | History totals and axes |
| `domain/frequency.ts` | Annual weekday frequencies using elapsed-date denominators |
| `features/insights/useTimelineScroll.ts` | Guard concurrent history requests; preserve viewport on prepends, not formatting width changes |

Feature components render derived results with native views and `react-native-svg`. Overview charts share Week/Month/Year navigation, with monthly Year buckets. Never persist analytics aggregates.

Root-only overview visibility excludes categories from general rankings/comparisons while retaining tree and individual analytics.

`domain/habitVisibility.ts` removes completely hidden branches/entries from Calendar and Insights display snapshots. The provider/repository keep complete data for exports, editing, and More’s recovery list. `HabitRepository.setHidden` plus refresh restores a root; descendants inherit visibility without stored flags.

`domain/calendarThreshold.ts` validates per-habit quantity/duration thresholds and derives fill intensity. Repository operations and migration 7 persist preferences, never totals or fill values.