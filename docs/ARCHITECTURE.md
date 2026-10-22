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

`HabitRepository` is the persistence and application-operation boundary. SQL stays in `src/data/`. Domain code imports no React, Expo, SQLite, or Drizzle modules.

`AppProvider` opens and migrates the database, then publishes habit and entry snapshots together. Startup becomes ready only after the initial snapshot succeeds. Failed startup attempts close their connection and expose a guarded retry; appearance-read failures fall back to System.

Entry operations retain request-specific completion state until snapshot publication succeeds. Retrying a committed request refreshes without repeating writes or revalidating a moved source snapshot. Direct-entry forms lock committed drafts after refresh failure, and `useHabitMutation` provides the same recovery for habit editors. Write failures remain retryable; successful changes publish localized success messages. More guards imports from document picking through confirmation and publication, blocking duplicate imports and overlapping export or deletion. Navigation blocks repeated pushes until the source screen regains focus and clears canceled animation frames.

The provider also resolves System/Light/Dark once for the app. The preference uses Expo SQLite key-value storage, separate from the product schema. Preference writes are serialized so rapid selections persist in order; a failed latest write restores the last saved mode and shows localized retry guidance. Screens consume the resolved palette. The root holds the native splash until appearance and startup data are ready, or a startup error can be shown. It then renders the app or recovery screen and hides the splash after layout, without an intermediate loading logo. A pending startup retry keeps the recovery screen mounted with a disabled progress button. It applies the palette to the native root background. Its navigation ThemeProvider uses the same resolved appearance and palette; stack content and tab scenes explicitly use the palette background so transitions do not reveal light navigation surfaces in dark mode. Expo SplashScreen configures device-themed launch colors; Expo SystemUI enables Android automatic appearance.

Drizzle declares the schema; explicit SQL migrations create and upgrade it. `HabitRepository.editTree` accepts updates, preorder creations with temporary parent keys, staged deletions and existing-category attachments as one transaction. `createTree` includes a new root in that transaction. `domain/treeAttachments.ts` owns compatible candidate selection and attachment validation. `domain/habitTypeChange.ts` plans explicit historical type conversions; `editTree` applies them atomically with the hierarchy draft. See [Database](DATABASE.md) for integrity guarantees.

The root shell renders one shared `AppBar` below its route stack; the nested Tabs navigator keeps screen state but hides its own bar. Footer destinations dismiss detail/editor stack routes back to the selected main screen. Detail and editor routes use `/insight/[id]` and `/habit/[id]`, respectively.

## Rendering and analytics

Home uses a horizontal `Animated.ScrollView` only for the date header. Its native-driven offset translates clipped value tracks in a separate virtualized vertical habit list; labels stay outside the horizontal scroller. A bounded date window and spacers preserve the scroll extent. The visible date/value matrix is recomputed when scrolling settles rather than for every scroll event; display values are memoized and never persisted.

Calendar day-sheet expansion is local UI state, reset to collapsed roots each time a day opens. Arrows reveal one hierarchy level at a time; totals continue to use the shared aggregation rules.

The Calendar tab virtualizes month grids in a native vertical list. The Insight activity calendar uses native horizontal scrolling with history prepending. Their interaction rules belong in [UI and UX](UI_UX.md).

`domain/aggregation.ts` builds a weakly cached hierarchy/entry index for each immutable provider snapshot. Repeated Home, Calendar, and Insights calculations reuse leaf, habit/date value, activity, and record-presence lookups without persisting derived data. `domain/insightsOverview.ts` computes week/month/year root rankings, elapsed-day denominators, and root active-day comparison series through the shared aggregation index. Visible children of archived roots are not promoted into overview categories. Comparison windows, selections and series are memoized so opening a filter does not rebuild them.

Main screens prefetch reachable routes. Insight detail defers chart rendering until its opening transition ends, with a fallback for direct launches. Consistency and Calendar render first; lower sections load as the viewport approaches them, based on the visible viewport. Detail comparison and single-category selections are reconciled when categories disappear or become archived, falling back to the opened root if needed. Reveals respect Reduce Motion. Dialog drafts and pending-write state stay local to avoid re-rendering background charts; committed data refreshes still update them. Consistency comparison inputs are memoized. Calendar grids, day-sheet rows, and Insight calendar weeks use virtualized lists; the larger calendar starts at the selected week.

`domain/habitAppearance.ts` owns emoji validation and nearest-ancestor color inheritance. Palette values and display accents live in `theme/habitColors.ts`; only explicit color choices are persisted.

`domain/booleanAnalysis.ts` derives an immutable Boolean habit/entry snapshot for individual quantity/duration analysis. Calendar, History, streaks and Frequency use that snapshot; Consistency always uses the original positive-value records. Calendar thresholds use original aggregated values in either mode; calendar mutations retain original stored types and values. No derived activity is persisted.

`domain/analytics.ts` owns common calendar periods and streaks. `domain/chartTimeline.ts` builds the Day/Week/Month/Quarter/Year buckets shared by the independent Consistency and History detail menus. `domain/habitStrength.ts` computes daily exponential habit strength and bucket averages; `domain/history.ts` computes History totals and axes. `domain/frequency.ts` computes weekday frequencies from elapsed-date buckets. Detail streaks use all recorded activity through today, and Frequency uses annual buckets across the selected branch's full history. `features/insights/useTimelineScroll.ts` guards overlapping drag/momentum history requests and preserves the viewport only when buckets are prepended; width changes from formatting do not shift it. Feature components coordinate filters and render derived results with native views and `react-native-svg`. Overview charts retain their shared Week/Month/Year navigation, with monthly buckets for Year. No analytics aggregates are persisted.

Overview visibility is persisted as a root-only preference. `domain/insightsOverview.ts` excludes hidden roots from general rankings and comparisons; tree construction and individual analytics retain them.

`domain/habitVisibility.ts` derives a display snapshot without completely hidden branches or their entries for Calendar and Insights. The provider and repository retain the complete snapshot for persistence, export, hierarchy editing and the More hidden-category list. More exposes recovery through `HabitRepository.setHidden`, followed by a refresh; the root preference applies to descendants without storing inherited flags or aggregates.

`domain/calendarThreshold.ts` validates optional quantity/duration color rules and derives fixed calendar fill intensity. Thresholds are per-habit preferences persisted through repository operations and migration 7; derived day totals and fill values are never stored.
