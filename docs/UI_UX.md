# UI and UX

Owns interaction and presentation rules that are not obvious from the running app. [Product](PRODUCT.md) defines scope, [Database](DATABASE.md) data semantics, [Architecture](ARCHITECTURE.md) implementation, and [Testing](TESTING.md) verification. Exact dimensions, colors, layout, and translations live in source.

## Shared presentation

- Text uses locally bundled Manrope. Light mode uses cream/beige surfaces with mahogany accents; dark mode uses warm charcoal with cream text. Appearance supports System, Light, and Dark.
- Respect safe areas, large text, narrow screens, and Reduce Motion; keep feedback immediate and motion restrained.
- The Home/Calendar/Insights/More footer persists on detail/editor screens, selecting Insights/Home respectively. Destinations dismiss those routes subject to draft guards.
- Destructive confirmations identify the affected habits/records.

## Home

- Show five day columns, initially today into the past. Horizontal scrolling moves values while the header and habit labels stay fixed; older dates load as needed. A Today shortcut appears after scrolling into the past. Accessibility actions also navigate dates.
- Indentation expresses hierarchy. Indentation, tint, and name-size reduction cap after four levels; value font sizes stay constant.
- Habit identities open Insights; separate chevrons expand groups. Roots reorder by drag handle or accessibility actions, moving expanded descendants together. Failed saves retain the previous order.
- Boolean leaves and parents with only direct activity toggle immediately. A Boolean parent with active descendant records, or a number/duration parent with any descendant records (including zero), opens the branch day editor. Other number/duration cells use the shared entry form.
- Touch and hold any day cell (or use its accessibility action) to review or move its records.

### Branch day editor

Show the habit, date, one row per record with a switch or numeric input, and a compact **Now → After saving** preview. Ancestry labels disambiguate names; direct records show as “Direct entry.”

Switch off records or use **Clear day**; **Save** atomically updates retained values and deletes disabled records. Zero is valid; other branches/dates stay unchanged. Cancel, Close, Back, and backdrop discard drafts. An unchanged quantity/duration draft can open the parent’s direct-entry form inside the same modal.

**Move day** opens a month picker with future dates disabled. Save moves retained records and deletes disabled ones atomically. Destination conflicts, including zero, block Save without merging or overwriting; choose another date or cancel to edit the destination.

Apply [shared write recovery](#entry-editing-and-sheets). Stale source records require reopening the draft.

## Habit editor

- Descendant editing opens the root hierarchy; new sub-habits inherit its type. **Add sub-habit** inserts a blank row above the existing ones. Each row has one line of actions: add a sub-habit inside it, move the whole subtree up or down among its siblings, and delete. Everything stays a draft until Save; Cancel discards it.
- Keep the screen short: no section explanations, and the same three-way type selector for new and saved habits. Moving a habit elsewhere is not an editor action; see [Moving a habit](#moving-a-habit).
- Names allow 1–25 Unicode code points after trimming; a counter appears within five characters of the limit. Emoji input accepts empty or one complete emoji, including flags, skin tones, keycaps, and joined sequences. Reject invalid input without truncating or discarding drafts; unchanged legacy names/emojis remain valid.
- New roots default to Automatic color, which inherits the nearest ancestor or root default; children can override. The palette offers thirteen colors.
- Root visibility offers **Hide from overview** and **Hide completely**; see [Category visibility](#category-visibility).
- Quantity/duration habits may set a positive, non-inherited calendar threshold. Blank removes it; duration uses value-preserving Minutes/Hours and rejects fractional seconds instead of rounding.
- Confirm impact before staging descendant deletions; summaries exclude General identities but include their records.
- Active roots have no Archive action; use Hide completely. Previously archived roots retain Restore, which acts on saved data and confirms discarding a changed draft.
- Back, Cancel, native gestures, and footer navigation confirm discarding changed drafts; unchanged/reverted drafts leave without prompting. Save, restoration, deletion, and Cancel return Home and dismiss intermediate routes so Back cannot reopen unavailable habits.

### Changing a habit type

Root **Change habit type** offers Yes/No, Quantity, and Duration. It applies to the original branch, including General/archived descendants, and clears thresholds; reverting restores draft thresholds.

Conversion value rules belong in [Database](DATABASE.md#transactions-and-integrity). Branches without records need no conversion value. Warn that conversion to Boolean loses original numeric values permanently.

Save requires a localized warning naming category, branch/record counts, target type, and conversion value; dismissing writes nothing. Conversion and hierarchy changes commit together; stale membership/records show a localized rejection.

### Moving a habit

The Insights header of any active habit, at any depth, opens **Move to…**. It is the only way to change a habit’s parent.

- List **Top level** (unless already there) followed by compatible destinations with their full path: same type, active, outside the habit’s own branch, and not its current parent. Show search once the list is long.
- Selecting a destination previews the old and new path and how many sub-habits and records move with it. **Move** stays disabled until then.
- Moving is immediate, not a draft: it commits in one transaction, appends the habit after the destination’s existing sub-habits, refreshes, and shows a success message. Failures keep the sheet and selection.
- The habit takes the destination’s visibility; root-only visibility flags are cleared when it leaves the top level.

## Entry editing and sheets

- Direct parent input targets General and preserves descendants, so deleting it may leave parent activity.
- Number/duration editors offer Save, existing-record Delete, and Cancel/Back. Zero is valid. Duration accepts decimal Minutes/Hours with value-preserving conversion; whole hours initially use Hours, otherwise Minutes.
- Writes block duplicate submission, conflicting dismissal, and filter changes. Failures retain drafts with localized errors.
- After a commit whose refresh fails, explain that data is saved, lock mutation controls (including for accessibility navigation), and let Save retry publication only. Habit Save, restoration, and deletion use the same recovery.
- Calendar editing, filters, moving a habit, export, and conversion guidance share anchored popovers. Close/Cancel, outside tap, Android Back, or accessibility escape dismiss unless a write is pending. In Calendar drafts, Back/escape first returns to the day list.

## Calendar tab

Months scroll vertically into older history with Monday-first weekdays, a Today shortcut, and an outlined current day. Future dates are disabled. Positive activity fills cells at 30% opacity using overview root colors; multiple roots form equal radial sectors. Zero adds no color. Accessible names identify all contributing roots.

### Selected day

Open all visible roots collapsed, including inactive ones. Only parent arrows toggle one level; labels neither expand nor edit. Totals include descendants/General. Switching/reopening resets expansion; Save/Delete retains it. Boolean toggles immediately; number/duration uses shared editing. No habit creation or hierarchy editing here.

## Insights

### Overview

- Defaults to Month with shared Week/Month/Year navigation. Next stops at the current period; switching tabs resets there. Weeks start Monday; current periods end today; outside/future records are excluded.
- The pie uses root active days, counting each branch once per date, so mixed types never sum quantities with seconds. Selected roots’ combined active days form the denominator. Omit zero sectors and explain empty periods.
- A root grid in saved order shows emoji, name, and active/elapsed days, and opens detail. Inactive roots stay at 0%.
- Consistency compares root strength curves; History stacks root active-day counts with a combined total above each nonzero bar. When totals need more room, History scrolls horizontally with a fixed value axis.
- Pie, Consistency, and History each have an independent one/several/all-root filter: default all, at least one retained, reset to all if selected roots disappear. Period navigation does not change selections.
- Tapping a sector, curve, segment, or legend highlights that category in that chart only; tap again to clear. Highlights never change filters/values.

### Detail

The header holds Back, the habit title, a move button, and an edit button. Opening detail immediately exposes accessible progress and rejects repeated taps. Sections appear in this order:

| Section | Behavior |
| --- | --- |
| Consistency | Habit strength from 0–100%, rising with activity and decaying on missed days. |
| Calendar | Activity timeline whose day boxes open a larger calendar for day editing. |
| History | One stacked bar per period. Records belong to the deepest selected habit; parents retain only contributions not assigned to selected descendants. Boolean dates count once, split equally among active selected segments. |
| Best streaks | Up to five longest active-date ranges across all recorded history through today. |
| Frequency | Weekday activity across all recorded history, grouped into annual columns. |

- **Mode:** quantity/duration detail starts in its typed mode and offers Activity, which counts any stored record, including zero, once per branch/date. Mode applies to Calendar, History, streaks, Frequency, and the enlarged Calendar; it preserves periods/selections and resets on another habit. Consistency always uses original positive records. Boolean habits have no mode selector.
- **Grouping:** Consistency and History have independent Day/Week/Month/Quarter/Year menus, initially Day and reset when opening another habit. Best streaks/Frequency use all history without period controls.
- **Selection:** Consistency, Calendar, and History have independent multi-selection, initially the opened habit, retaining at least one. Selectors list parents followed by complete visible subtrees in saved order and omit General/archived branches. Unavailable selections fall back to the opened root; restoration does not reselect.
- **Timelines:** open at the latest data, scroll horizontally into earlier buckets, and preserve position on prepend. Axes and legends stay outside scrolling. Current buckets end today.
- **History:** sums typed values or unique Boolean dates, including direct entries at all depths and archived descendants without duplication. Each nonzero stack shows one total in its unit.
- **Help:** every chart except Calendar has an information button that toggles initially collapsed inline help, in equivalent English/Spanish. No help alerts.
- **Loading:** the header, Consistency axes, Calendar dates, and fixed-height placeholders show during the opening transition. Consistency/Calendar become interactive first; Calendar editing stays disabled with an accessible busy state until activity is ready. Lower sections mount in order as scrolling approaches. Reduce Motion skips the line draw and fades.

### Consistency timeline

Consistency starts at zero and counts positive branch activity once per day for every type, including direct/archived descendants. Exponential smoothing has a thirteen-day half-life: thirteen active days reach 50% from zero; thirteen missed days halve the score. Scores carry across periods without targets/schedules.

Points show daily strength or elapsed daily averages for Monday–Sunday weeks, natural months, quarters, and years. Dots have no readout; values remain accessible.

Above the plot, show the opened habit’s current strength, signed percentage-point changes since 30/365 days ago, and total unique active dates. Summaries stay anchored to today while browsing/comparing.

### Detail Calendar

- Start at the current month’s end, completing its final week through Sunday with disabled future boxes.
- Combine selected branches’ activity. Explicit active descendant colors take priority over parent fallback; simultaneous colors form sectors. Deduplicate overlapping branches and identical colors.
- Any compact box opens the enlarged calendar centered on the tapped week without mutating data. Future boxes may open the dialog but cannot be edited.
- Only the enlarged dialog edits, with an explicit editing habit when several are selected. Boolean toggles direct input; number/duration uses the shared form within the same modal. Back exits the form before the dialog.
- Thresholds: original aggregated activity strictly below the threshold gets 30% fill; at/above gets full fill, in both calendars and both modes. Thresholds affect appearance only.

### Frequency timeline

Annual columns cover at least the current year and nine preceding years, extending to the selected branch’s first recorded year, including child/archived records. Denominators use complete past years and elapsed current-year weekdays; future dates are excluded. Circle size/shade reflects active/possible days. Longer histories open at the latest year beside a fixed weekday axis. Circles are non-interactive; accessible labels give year, weekday, and counts.

## More

Group More into Appearance, Data, and Help & about.

- Export opens a cancelable all-selected root selector including hidden/archived roots. Disable empty export and block selection/dismissal while sharing. [Database](DATABASE.md#import-and-export) owns format and cache cleanup.
- Help & about credits PalFly and links terms, privacy, support, and GitHub. Legal/support links follow device locale and open only on tap, with failure guidance.
- AI conversion happens outside the app; its guidance explains privacy. Copy and instructions use Spanish for Spanish locales, English otherwise; JSON keys/enums stay unchanged.
- File/import errors show localized guidance, never raw platform/validation details.
- Advanced settings starts collapsed and holds Delete all data, which requires three cancelable confirmations; final counts exclude General identities. Appearance and externally exported copies remain.

## Category visibility

Root-only **Hide from overview** defaults off. It excludes roots from the overview grid/charts/filters while preserving Home and individual analysis.

Independent root-only **Hide completely** also defaults off. It excludes the whole branch from Home, all analysis/filter views, and Calendar cells/day sheets. Direct hidden Insight routes show unavailable unless opened from Home’s revealed list; that detail view adds only the opened hidden branch and changes no stored visibility. Records stay stored/exportable; archive rules still apply.

More → Data shows a collapsed Hidden categories card, omitted when empty. Names open editing; eye buttons permanently restore while preserving overview-only preferences. Failures retain rows and block duplicates.

Three taps on Home’s Oi Siu title, at most half a second apart, toggle a collapsed Hidden categories row below the list; an accessibility action does the same. A localized toast announces the toggle, not the contents. Opening Insights from a revealed row keeps the reveal for Back; leaving for another tab, the editor, or the next ordinary departure from Home clears it. Only the editor’s switch hides a restored habit again.

## Success messages

After successful habit/record changes, show a brief non-blocking localized toast with emoji, name, and action; General changes identify the parent. Announce politely above the footer/active sheet, replacing older success messages.

## Startup

Hold the native splash until appearance/data are ready, then show the app without a second logo/spinner. On failure, hide it after the localized recovery layout. Try again stays visible, disabled with progress while pending, and rejects duplicates. [Development](DEVELOPMENT.md#generated-android-files-and-assets) owns branding/rebuild guidance.
