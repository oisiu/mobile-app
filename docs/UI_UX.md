# UI and UX

Owns interaction and presentation. [Product](PRODUCT.md) defines scope, [Database](DATABASE.md) data semantics, [Architecture](ARCHITECTURE.md) implementation, and [Testing](TESTING.md) verification. Exact dimensions, colors, and translations live in source.

## Shared presentation

Use system fonts, tight large headings, cream/beige surfaces, mahogany accents, rounded controls, and quiet separators. Dark mode uses warm charcoal, lighter nested surfaces, cream text/actions, and readable secondary labels. Respect safe areas, large text, narrow screens, and accessibility; keep feedback immediate and motion restrained. Footer destinations retain distinct icon/label colors; selection fills the icon without changing the background. Appearance labels are localized; destructive confirmations identify affected habits/records.

Appearance supports System, Light, and Dark. See [Startup](#startup) for loading and recovery behavior.

The persistent Home/Calendar/Insights/More footer also appears in detail/editor screens, selecting Insights/Home respectively. Destinations dismiss those routes subject to draft guards. Footer transitions shift subtly; detail/editor routes slide from the right and reverse on return.

## Home

- Show “Oi Siu”, a top-right New habit button, and the full localized month name; include the year outside the current year. Empty guidance points to the same add button.
- Show five day columns, initially today into the past. Horizontal date-header scrolling moves values while habit labels stay fixed. Load older dates as needed; accessibility actions also navigate dates.
- Keep the header visible while habits scroll vertically. Each habit, including expanded children, has a full-width rectangular surface band; gaps separate root groups. Indentation expresses hierarchy.
- Expanded descendants use a progressively tinted full-width surface in light and dark themes. The tint approaches a bounded shade. Indentation and name-size reduction cap after four levels to keep deep trees readable. Value font sizes stay constant.
- Habit identities open Insights; separate chevrons expand groups. Root categories have a subtle six-dot drag handle in two columns with a small visual footprint and a larger touch area: drag up or down to save their order, moving expanded descendants together. Accessibility actions move a category up or down. Failed saves retain the previous order.
- A Today shortcut appears after scrolling into the past and returns dates and values to today.
- Boolean leaves and parents with only direct activity toggle immediately. A parent with active descendant records opens the branch day editor. Number/duration parents open it when descendant records exist, including zero; other number/duration cells use the shared entry form.
- Touch and hold any day cell (or use its accessibility action) to review or move its records.

### Branch day editor

Show habit emoji/name, date, emoji-led record rows, switches/numeric inputs, and a compact **Now → After saving** preview. Ancestry labels disambiguate names; direct records use the parent emoji and “Direct entry.” Avoid routine explanatory paragraphs.

Switch off records or use **Clear day**; **Save** atomically updates retained values and deletes disabled records. Zero is valid; other branches/dates stay unchanged. Duration rows preserve values across Minutes/Hours. Cancel, Close, Back, and backdrop discard drafts. An unchanged quantity/duration draft can open the parent’s direct-entry form inside the same modal.

**Move day** opens a month picker with future dates disabled. Choosing a date collapses it and shows the destination/count with an empty source preview; canceling restores the source. Save moves retained records and deletes disabled ones atomically. Destination conflicts, including zero, show emoji/name/value and block Save without merging or overwriting; choose another date or cancel to edit the destination.

Apply [shared write recovery](#entry-editing-and-sheets). Stale source records require reopening the draft. After a committed refresh failure, lock edit/date controls; Save retries publication only, then closes without repeating mutations.

## Habit editor

The + button inserts a blank child row above the existing children of that parent, including at nested levels and while creating a new habit. Save preserves the draft sibling positions across existing children, new children and moved subtrees.

New roots default to Automatic color. Names show live accessible counters and localized limits of 1–25 Unicode code points after trimming. Reject blank/overlong changes without truncating or discarding drafts; unchanged legacy names remain valid. Root creation offers optional emoji, name, twelve earthy colors, and localized type choices with examples. A circle-only button beside each emoji/name toggles the palette below; accessible labels identify current/options colors. Choosing a color or Automatic closes it. Automatic inherits the nearest ancestor or root default; children can override. Readable accents identify Home, Calendar, and chart series alongside names/emojis.

Emoji input accepts empty or one complete emoji, including flags, skin tones, keycaps, and joined sequences. Reject multiple emojis without losing drafts; unchanged legacy strings remain valid.

Descendant editing opens the root hierarchy; new children inherit its type. Each root/draft child has **Move here** beside its color control. The popover names the receiver and searches compatible active categories from other branches by name/path. Preview source and full destination ancestry, including unsaved names; choose another, cancel, or stage the complete subtree. Explain that children/history move together, destination visibility applies, and Save commits the move.

Exclude staged subtrees, ancestors, descendants already in the draft, General, incompatible, and archived categories. New roots/children can receive attachments. Removing an attachment cancels its move without deleting records; its existing descendants cannot be deleted here. Changing a new root’s type clears staged children. Save commits creation, edits, and attachments together; Cancel preserves original branches. Refresh Home after saving.

Back, Cancel, native gestures, and footer navigation confirm discarding changed drafts; unchanged/reverted drafts and successful Save leave without prompting. Creation, hierarchy saves, archive/restore, and Cancel return Home, including direct launches. Dismiss intermediate routes so Back cannot reopen unavailable habits.

Confirm impact before staging descendant deletions; Save commits them with hierarchy edits. Impact loading blocks conflicting actions; errors retain drafts. Root archive and permanent deletion are separate. Archive/restore on a changed draft confirms discarding edits and acts on saved data. Deletion summaries exclude General identities but include their records. Root deletion returns Home without stale routes.

Insight detail places Back, the wrapping habit title, and an accessible edit button in its header.

Navigation immediately exposes accessible progress and rejects repeated taps. Detail shows its header/static placeholders during transition, then Consistency/Calendar; enlarged calendars render the selected weeks first. Reduce Motion disables fades.

Quantity/duration roots and children may set a positive, non-inherited calendar threshold in the hierarchy draft. Blank removes it; duration uses value-preserving Minutes/Hours and integer seconds. Threshold edits participate in draft guards and the save transaction.

### Changing a habit type

Root **Change habit type** applies to the original branch, including General/archived descendants, under the draft guard. It clears attachments and thresholds; reverting restores draft thresholds. New compatible attachments retain their target-type values.

Conversion inputs and value rules belong in [Database](DATABASE.md#transactions-and-integrity). The UI accepts Minutes/Hours for durations with value-preserving conversion and whole-second validation. Branches without records need no conversion value; explain that only type changes. Warn that conversion to Boolean loses original numeric values and cannot recover them by converting back.

After validation, Save requires a localized warning naming category, branch/record counts, target type, and conversion value. Dismissing writes nothing. Confirmation/writes block duplicate saves and dismissal; success releases the draft guard. Conversion and hierarchy changes commit together; stale membership/records show localized rejection.

## Entry editing and sheets

Direct parent input targets General and preserves descendants, so deleting it may leave parent activity. The [branch day editor](#branch-day-editor) handles descendant review, edits, removal, and moves; [Database](DATABASE.md) defines aggregation.

Keyboard-aware number/duration editors offer Save, existing-record Delete, and Cancel/Back. Zero is valid. Duration accepts decimal Minutes/Hours with value-preserving conversion; whole hours initially use Hours, otherwise Minutes. Compact displays round to minutes with hour carry.

Writes block duplicate submission, conflicting dismissal, and filter changes. Failures retain drafts with localized errors; success refreshes values. After commit with failed refresh, explain that data is saved, lock mutation controls, and retry publication only. Direct-entry Cancel remains available. Habit Save, archive/restore, and deletion use equivalent guarded recovery with cancelable deletion review.

Calendar editing, filters, Move here, export, and conversion guidance share anchored popovers: short fade, below/above trigger according to space, safe-area bounds, keyboard avoidance, and bounded scrolling. Close/Cancel, outside tap, Android Back, or accessibility escape dismiss unless a write is pending. In Calendar drafts, Back/escape first returns to the day list.

## Calendar tab

Months scroll vertically into older history. Show Monday-first weekdays, localized month/year separated only by a space, Today shortcut, and an outlined current day. Disable future dates. Positive activity fills cells at 30% opacity using overview root colors; multiple roots form equal radial sectors. Zero adds no color. Show only dates in theme foreground; accessible names identify all contributing roots.

### Selected day

Open all visible roots collapsed, including inactive ones. Only parent arrows toggle one level at any depth; labels neither expand nor edit. Totals include descendants/General. Switching/reopening resets expansion; Save/Delete retains it. Boolean toggles immediately; number/duration controls use shared editing. No habit creation/hierarchy editing here.

## Insights

Overview defaults to Month with shared Week/Month/Year navigation. Previous/Next moves one period; Next stops at current, and switching tabs resets there. Weeks start Monday; historical periods use their full range and current periods end today. Exclude outside/future records. Weekly headings use only a date range (5-11/10/2026), months use capitalized localized month/year, and years use the year; append Active days and show a matching caption.

The pie uses root active days, counting each branch once per date, so mixed types never sum quantities with seconds. Its independent filter supports one/several/all roots (default all), retains at least one, survives navigation, and resets to all if selected roots disappear. Selected roots’ combined active days form the denominator for sectors, percentages, accessible values, and legend. Center labels on sector midpoints; use the center for a lone 100% sector. Omit zero sectors/labels and explain empty periods.

Below the pie, a three-column root grid follows saved order and wraps. Tiles show emoji, name, active/elapsed days, and open detail. Inactive roots remain at 0%; current denominators grow daily, completed ones use full weeks/months/365-or-366-day years. The wrapping pie legend includes only contributing roots in saved order. Unset colors use the theme accent; explicit/inherited palette colors remain unchanged.

Below the grid, Consistency compares root strength curves; final History stacks independent root active-day counts. Both have independent one/several/all-root filters, retaining at least one selection, and legends. Shared Week/Month/Year navigation does not couple category selections. Consistency uses continuous lines without detail summaries/dots: daily Week/Month values, twelve monthly Year averages, labels every three months, and year boundaries. History Year spans twelve months; Month retains every date position, including empty/future ones, and skips labels as needed to fit.

Overview legends sit below charts, show names without emojis, and use compact spacing with extra vertical touch reach. Tapping a pie sector, curve, segment, or legend highlights that category and dims others only in that chart; tap again to clear. Missing categories have no active highlight. Highlights never change filters/values. “X selected” controls use compact icon-free pills and detail-style popovers with separated rows, inline Close, and header All.

Quantity/duration detail starts in its typed mode and offers accessible Activity buttons. Mode applies to Calendar, History, streaks, Frequency, comparisons, and enlarged Calendar; preserve periods/selections and reset on another habit. Activity counts any stored record, including zero, once per branch/date. Consistency always uses original positive records, including summaries; Calendar edits retain original forms. Boolean habits have no mode selector.

Detail charts except Calendar have an accessible 44-point information button beside/centered on the title. It independently toggles initially collapsed inline help above the chart, exposing expanded state; use concise equivalent English/Spanish paragraphs for purpose, counting, and interaction. No help alerts. Consistency explains decay, carry-over, thirteen-day half-life, and today’s summary; History explains grouping, scrolling, quarter labels, and totals. Streak/Frequency help explains units and interaction.

Detail sections appear in this order:

| Section | Behavior |
| --- | --- |
| Consistency | Habit strength from 0–100%, rising with activity and gradually decaying on missed days, with its own Day/Week/Month/Quarter/Year grouping menu and horizontal history browsing. |
| Calendar | Activity timeline whose day boxes open a larger calendar for day editing. |
| History | One stacked bar per period. Records belong to the deepest selected habit; parents retain only contributions not assigned to selected descendants. Boolean dates count once, split equally among active selected segments. |
| Best streaks | Up to five longest active-date ranges across all recorded history through today, with dates above full-width bars. |
| Frequency | Weekday activity across all recorded history, grouped into annual columns. Circle size and shade reflect active days divided by elapsed matching weekdays in each column. Future dates are excluded. |

Consistency/Calendar become interactive first. Fixed-height skeletons preserve layout until scrolling approaches History and lower sections, which mount in order.

Detail has no shared time selector: Consistency/History have independent Day/Week/Month/Quarter/Year menus, initially Day and reset when opening another habit; Calendar keeps its navigation. Best streaks/Frequency use all history through today without period controls.

Consistency, Calendar, and History have independent multi-selection, initially the opened habit, retaining at least one. All five habit selectors list parents followed by complete visible subtrees in saved sibling order; omit General/archived branches. Remove unavailable selections, falling back to the opened root; restoration does not reselect. Rows use Home’s bounded depth tint/indentation, constant font size, and explicit checkboxes/radios.

Consistency/History place grouping to the right of the habit selector using compact icon-free, chevron-free pills and shared popovers. The habit selector uses remaining width before truncating; controls wrap below titles on narrow screens. Timeline labels are numeric days with centered abbreviated month/year beneath the first bucket and every month boundary; Monday day/abbreviated-month for weeks, abbreviated months for months, quarter-start months for quarters, and years for years. Show year boundaries below weekly/monthly/quarterly labels. Current buckets end today.

Both timelines open at the latest data and scroll horizontally into earlier buckets with hidden scrollbars, no overscroll, readable spacing, and preserved position on prepend. Axes and legends stay outside scrolling. History sums typed values or unique Boolean dates with comparison attribution. Each nonzero stack shows one compact total in its unit; zero buckets retain position without labels. Include direct entries at all depths and archived descendants without duplication. Bars open no readout/list; omit the active-day caption but retain duration units. Detail legends show emojis/names below charts.

### Consistency timeline

Consistency starts at zero and counts positive branch activity once/day for every type, including direct/archived descendants. Exponential smoothing has a thirteen-day half-life: thirteen active days reach 50% from zero; thirteen missed days halve the score. Carry scores across periods without targets/schedules.

Points show daily strength or elapsed daily averages for Monday–Sunday weeks, natural months, quarters, and years. History sums those buckets instead. Each selected habit has a line/dots and fixed percentage axis with compact `N%` labels in a left gutter. Dots have no readout; values remain accessible.

Above the plot, show the opened habit’s current strength, signed percentage-point changes since 30/365 days ago, and total unique active dates. Summaries stay anchored to today while browsing/comparing.

### Detail Calendar

Start at the current month’s end, completing its final week through Sunday with disabled future boxes. Add years to month labels outside the current year. Compact/enlarged calendars support horizontal history loading and accessible month navigation.

Combine selected branches’ activity. Explicit active descendant colors take priority over parent fallback; simultaneous colors form sectors. Deduplicate overlapping branches and identical colors. Thresholds always use original aggregated values, including Activity mode.

Any compact box opens the enlarged calendar without mutating data; no separate Edit button. Center the tapped week within bounds; outline the selected day and show its full date. Include weekday labels, 44-point day targets, and a top-right accessible localized close icon. Future boxes may open the dialog but cannot be edited.

With multiple selections, offer an explicit editing habit while retaining combined colors. Only the enlarged dialog edits: Boolean toggles direct input; number/duration uses the shared form within the same native modal. Save/Delete/Cancel returns to Calendar; Back exits form before dialog. Show pending day feedback and apply shared write guards, General routing, and future restrictions.

For quantity/duration thresholds, original aggregated activity strictly below the threshold gets 30% fill; at/above gets full fill, in both calendars/modes. Low-fill cells retain readable text and accessible below-threshold labels. Thresholds affect appearance only.

### Frequency timeline

Frequency shows fixed-width annual columns covering at least the current year and nine preceding years, extending to the selected branch’s first recorded year, including child/archived records. Empty history still shows ten years. Denominators use complete past years and elapsed current-year weekdays; future dates are excluded. Circle size/shade reflects active/possible days. Right-align short histories; longer ones open at the latest year beside a fixed localized weekday axis on the right. Scroll earlier years without period/date controls. Circles are non-interactive; accessible labels give year, weekday, and active/possible counts. Category and Activity-mode selections apply.

## More

Group More into Appearance, Data, and Help & about. Offer saved appearance, JSON/CSV export, safe JSON import, and external AI conversion guidance. Export opens a cancelable all-selected root selector including hidden/archived roots; allow one/several roots with full descendant history. Disable empty export and block selection/dismissal while sharing. [Database](DATABASE.md#import-and-export) owns format and cache cleanup.

Help & about credits PalFly and links terms, privacy, support, and GitHub. Legal/support links follow device locale. Open links only on tap, with link semantics, localized browser hints, and failure guidance. Conversion explains privacy and happens outside the app; keep copy/close actions outside the bounded scrolling prompt and clear of keyboard/safe areas.

More copy/dialogs and displayed/copied AI instructions use Spanish for Spanish locales, English otherwise. Keep JSON keys/enums unchanged. File/import errors show localized guidance, never raw platform/validation details.

Advanced settings starts collapsed with accessible expanded state. It reveals deletion guidance and a compact Delete all data button with an accessible target. Require three cancelable confirmations; final counts exclude General identities. Delete all habits/records, including archived ones, with guarded submission and localized errors. Appearance and externally exported copies remain.

## Category visibility

Root-only “Hide from general analysis” defaults off and participates in draft guards. It excludes roots from overview grid/charts/filters while preserving Today and individual analysis; turning it off restores eligibility.

Independent root-only “Hide completely” also defaults off. It excludes the entire branch from main Today, all analysis/filter views, and Calendar cells/day sheets; direct hidden Insight routes show unavailable. Records stay stored/exportable; archive rules still apply.

More → Data shows a collapsed Hidden categories card below transfer controls, omitted when empty. List roots by saved order with emoji/name; names edit, eye buttons permanently restore while preserving overview-only preferences. Explain that leaving does not re-hide. Failures retain rows; block duplicates. A committed refresh failure locks editing/recovery and offers refresh-only Try again with saved-state guidance.

Three taps on Home’s Oi Siu title, at most half a second apart, toggle a collapsed full-width Hidden categories row below the list; an accessibility action also toggles it. Localized toasts announce section enabled/hidden, not expanded contents. Leaving Home, including opening detail/editor, clears reveal and partial taps. Expanding lists hidden habits with smaller text and Home’s rectangular, indented/tinted rows, without a rounded card, outer inset, or explanatory paragraph. Editing/eye recovery work here too. The editor’s hiding switch explains both access paths in English/Spanish; only that switch hides a restored habit again.

## Success messages

After successful habit/record changes, show a brief non-blocking localized toast with emoji, name, and action; General changes identify the parent. Announce politely above the footer/active sheet, replacing older success messages.

## Startup

Hold the native splash until appearance/data are ready, then show the app without a second logo/spinner. On failure, hide it after localized recovery layout. Try again stays visible, disabled with progress while pending, and rejects duplicates. [Development](DEVELOPMENT.md#generated-android-files-and-assets) owns branding/rebuild guidance.
