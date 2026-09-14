# Testing

[UI and UX](UI_UX.md) defines expected behavior.

## Required gates

Run from the repository root before handoff:

| Command | Checks |
| --- | --- |
| `pnpm run doctor` | Expo configuration and native dependency compatibility |
| `pnpm verify` | TypeScript, zero-warning ESLint, Knip, and domain coverage |
| `pnpm test` | Complete Vitest suite |
| `pnpm build` | Production Android and iOS bundle export |
| `pnpm run audit` | Fixable high/critical production advisories, subject to configured exceptions |

[Vitest configuration](../vitest.config.ts) owns coverage scope, exclusions, and enforced thresholds. CI retains coverage reports; do not lower thresholds to pass.

## Translation verification

Whenever user-facing text is added or changed, update all supported translations (currently English and Spanish) in the same change. Use the shared translation lookup rather than hard-coded UI copy. Verify the changed text in both locales, including interpolation, symbols, related dialogs, and accessibility labels; check unsupported-language fallback where relevant. Inspect wrapping and readability on a device when practical.

## Automated coverage

| Test file | Main coverage |
| --- | --- |
| [domain](../tests/domain.test.ts) | Aggregation/index reuse, zero-record lookup, formatting, typed entries, tree integrity, import conflicts, periods, streaks, and series selection |
| [dateWindow](../tests/dateWindow.test.ts) | Home window edges, overscan, and history growth |
| [calendarExpansion](../tests/calendarExpansion.test.ts) | Recorded branches, ancestor paths, zero/General records, and empty days |
| [insightsOverview](../tests/insightsOverview.test.ts) | Monthly ranking and elapsed-day denominators |
| [scoreWindow](../tests/scoreWindow.test.ts) | Full calendar periods, leap years, and future-date exclusion |
| [insightCalendarEntry](../tests/insightCalendarEntry.test.ts) | Direct Boolean toggles, General routing, zero records, duration conversion, and invalid input |
| [history](../tests/history.test.ts) | Ranges, navigation bounds, aggregation, rounded axes, and units |
| [frequency](../tests/frequency.test.ts) | Month/year labels, full-month denominators, circle sizing, and activity deduplication |

Settings locale regression tests in [settingsLanguage](../tests/settingsLanguage.test.ts) cover Spain, Mexico, Argentina, English, and unsupported-language fallback, including count interpolation and the AI prompt’s JSON example.

Insights selector regression tests in [orderedCandidates](../tests/orderedCandidates.test.ts) cover shuffled storage order, nested subtree grouping, sibling order, selecting a subtree root, hidden/archived exclusions, and 1,000 levels of depth.

Calendar positioning tests in [calendarScroll](../tests/calendarScroll.test.ts) cover centering at different widths, clamping at either edge, and short content.

Branch tests in [branchDay](../tests/branchDay.test.ts) cover deep contribution paths, zeros, archived records, typed edits, valid/invalid dates, stale snapshots, date/branch isolation, move conflicts, and English/Spanish/fallback copy. Repository tests execute the real migrations and SQL through Node 22's in-memory SQLite adapter, including rollback after an injected update failure following an earlier deletion. These establish SQLite behavior but do not exercise Expo's native transaction bridge. History tests cover overlapping exact selections, unique Boolean dates, intermediate General activity, duration/number totals, archived descendants, and contribution readouts.

## Integration gaps

Automated tests do not exercise native gestures/components, the Expo SQLite bridge, or platform sharing. Node SQLite tests cover branch-edit transactions and fresh migration execution; broader upgrade/import rollback scenarios remain open. Add coverage for entry-preserving hierarchy changes, archive/delete, and migration/import rollback. Exercise affected operations in a native build until those gaps are covered.

iOS, dark mode, large text, screen readers, narrow layouts, failure injection, and large datasets require broader device coverage. Release readiness must be checked against the signed artifact and store-delivered installation; review store artwork and release notes for every release.

## Native checklist

Run relevant checks on Android and iOS. Before release, complete the checklist on installed builds and test across restart. Expo Go cannot verify launcher icons or the native cold-start splash.

| Area | Verify |
| --- | --- |
| Startup | Empty first launch, first habit creation, empty restart after deleting all habits, upgrade preservation, offline startup, persistence, launcher masks, and rebuilt splash in device/saved themes |
| Home | Date-header-only horizontal gestures, momentum, fixed labels and aligned values, history loading, nested vertical scrolling, branch-day draft switches/values, clear and move persistence, destination conflicts, date picker, direct-entry return, Cancel/Back, cell editing, group expansion, header add button with empty/long lists, empty guidance, Today visibility/return, and numeric/duration unit conversion, keyboard, repeated saves and failure retention |
| Habit editor | Root routing from descendants, deep creation, inherited types, deletion impact, atomic Save/rollback, archive/restore, and permanent deletion returning to Home with safe Back behavior; changed/unchanged/reverted drafts on Cancel, Android Back, native gestures and all footer destinations |
| Calendar tab | Month scrolling/history loading, Today, weekday alignment, future-day disabling, and emoji clipping on narrow screens |
| Calendar day sheet | Recorded-branch expansion, parent/leaf touch boundaries, direct versus aggregate values, zero/General records, unit changes, Save/Delete/Back, repeated taps, keyboard flow, and failures |
| Score | Week/Month/Year labels, future blanks, comparisons, filters, period gestures, explicit range/Previous/Next bounds, point inspection, and measured-width labels at 320 dp |
| Insights Calendar | Compact boxes open the larger dialog without writes; tapped week centers and selected day is outlined; close icon dismisses; month/year labels, prepend stability, accessibility navigation, Boolean toggles, parent General isolation, zero deletion, unit changes, return after Save/Delete/Cancel, Back/escape, keyboard flow, and failed/repeated saves |
| History | All four ranges, Previous/Next and forward limit, rounded ticks/units, grouped comparisons, horizontal overflow, exact filters, descendant/direct-parent totals, tap readouts, and unclipped labels in all four periods at 320 dp |
| Frequency | Horizontal momentum, earlier-month loading and position retention, newest-month bound, accessibility navigation, month/year labels, full-month denominators, filtering, tap readouts, and narrow-screen layout |
| Shared UI | Footer/Back destinations, detail title wrapping, sheet dismissal, theme persistence, toast emoji/copy/placement/timeout, long names, and safe-area clearance |
| Settings language | Spanish and English labels, appearance accessibility labels, import confirmation/results/errors, AI guide and copied instructions, wrapping at large text sizes |
| Data transfer | JSON/CSV sharing, import size rejection, duplicate/conflict handling, rollback, and no unintended overwrite |
| Accessibility | Light/dark contrast, large text, narrow/wide screens, TalkBack/VoiceOver focus and announcements, control labels, expanded states, and chart/date actions |

## CI and security

[CI](../.github/workflows/ci.yml) runs Knip, lint, typecheck, tests, Doctor, audit, and the Android/iOS bundle build serially. A failure stops all later steps. Local required gates are listed above.

[Security](../.github/workflows/security.yml) owns CodeQL, full-history Gitleaks, and zizmor scans. [Dependency review](../.github/workflows/dependency-review.yml) owns pull-request dependency checks. These workflows run independently of CI; a local quality-gate pass does not verify them. Schedules and dependency groups belong in [Dependabot configuration](../.github/dependabot.yml).

Follow the [Security policy](../SECURITY.md) for vulnerability reports and [documentation privacy guidance](DEVELOPMENT.md#documentation-privacy) before sharing evidence.
