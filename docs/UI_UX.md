# UI and UX

This document owns durable interaction and presentation rules. [Product](PRODUCT.md) owns scope, [Database](DATABASE.md) owns data semantics, and [Architecture](ARCHITECTURE.md) owns implementation. Exact dimensions, colors, and translated strings live in the source; verification belongs in [Testing](TESTING.md).

## Shared presentation

Use system fonts, the green palette, restrained motion, and labels/icons that do not rely on color alone. Respect safe areas and large text. Keep controls accessible and chart labels readable on narrow screens. Destructive confirmations identify affected habits and records.

Appearance supports System, Light, and Dark. The native splash initially follows the device theme; the app applies the saved preference once loaded. Branding assets and rebuild guidance belong in [Development](DEVELOPMENT.md#generated-android-files-and-assets).

The persistent footer offers Home, Calendar, Insights, and Settings, including on detail and editor screens. Detail selects Insights; editing selects Home. Choosing a destination dismisses those routes, subject to the draft guard below.

## Home

- Show “Oi Siu”, a top-right New habit button, and the full localized month name; include the year outside the current year. Empty guidance points to the same add button.
- Show five day columns, initially today into the past. Horizontal date-header scrolling moves values while habit labels stay fixed. Load older dates as needed; accessibility actions also navigate dates.
- Keep the header visible while habits scroll vertically. Each habit, including expanded children, has a full-width rectangular surface band; gaps separate root groups. Indentation expresses hierarchy.
- Expanded descendants use a progressively tinted full-width surface in light and dark themes. The tint approaches a bounded shade. Indentation and name-size reduction both cap after four levels to preserve habit-name space and readability at arbitrary depth: root names are 13 px, then each descendant level is one pixel smaller through 9 px at depth four. Value font sizes stay constant.
- Habit identities open Insights; separate chevrons expand groups. There is no reorder control.
- A Today shortcut appears after scrolling into the past and returns dates and values to today.
- Boolean leaves and parents with only direct activity toggle immediately. A parent with active descendant records opens the branch day editor. Number/duration parents open it when descendant records exist, including zero; other number/duration cells use the shared entry form.
- Touch and hold any day cell (or use its accessibility action) to review or move its records.

### Branch day editor

Use visual associations and simple words: the habit emoji/name and date, emoji-led record rows, switches or numeric inputs, and a compact **Now → After saving** preview. Small ancestry labels disambiguate repeated names; direct parent records use the parent's emoji and “Direct entry.” Avoid explanatory paragraphs in routine flows.

Switch off individual records or use **Clear day**; nothing is written until **Save**. Duration rows offer Minutes/Hours with value-preserving conversion. **Cancel**, Close, Back, and the backdrop discard the draft. Save updates retained values and deletes switched-off records together. Other dates and branches are unchanged. Zero remains a valid stored value. Numeric/duration users can open the parent's direct-entry form inside the same modal when the branch draft is unchanged.

**Move day** reveals a visual month picker with future dates disabled. Selecting a destination collapses the picker and shows the destination date and record count; the source-day preview becomes empty. Save moves retained records and deletes switched-off ones atomically. A destination entry for the same habit, including zero, blocks the move and appears with its emoji/name/value. Users choose another date or cancel and edit the destination first; nothing is overwritten or merged. Canceling the date choice restores the source date.

Writes block repeated input and dismissal. Failures retain the draft. Changed source records cause a stale-draft error; reopening refreshes the snapshot.

## Habit editor

Create roots with an emoji, name, and a localized type choice with an example. Editing a descendant opens its root's hierarchy editor. New children inherit the branch type; there is no parent selector.

Back, Cancel, native back gestures, and footer navigation confirm before discarding changed drafts. Unchanged or fully reverted drafts leave immediately; successful Save does not prompt.

Descendant deletions are staged after impact confirmation; Save commits the hierarchy edits together. Root archive and confirmed permanent deletion are separate actions. Successful root deletion returns to Home without leaving a stale detail/editor in the Back stack.

Insight detail places Back, the wrapping habit title, and an accessible edit button in its header.

Habit-to-detail and detail-to-editor taps show immediate in-place progress and reject repeated taps while navigation starts. Insight detail paints its header and theme-aware chart skeletons first, then builds the chart-heavy content after the native route transition. Opening the larger Insight calendar similarly paints its dialog and calendar-shaped skeleton before constructing the full timeline. Skeletons are static so their feedback adds minimal rendering work.

## Entry editing and sheets

Direct parent input targets its hidden General record and preserves descendant entries. The Home branch day editor above separately allows reviewing, editing, removing, and moving descendant records. Displayed parent activity may therefore remain after deleting direct input; [Database](DATABASE.md) defines aggregation.

Number/duration editors are keyboard-aware and offer Save, Delete for an existing record, and Cancel or Back. Duration input accepts decimal Minutes/Hours and preserves the amount when units change. Whole-hour values initially use Hours; other values use Minutes. Zero is valid.

Writes block repeated submission and conflicting dismissal/filter changes. Failed writes retain the draft and show an error. Successful writes refresh displayed values.

Day sheets and Insight filters dismiss through the Close handle, backdrop, Android Back, or accessibility escape. The handle is a button. In a Calendar day draft, Back/escape first returns to the day sheet.

## Calendar tab

Months scroll vertically and load older history. A Monday-first weekday row, month/year headings, Today shortcut, and highlighted current day orient navigation. Future days are disabled. Day cells show up to three distinct root emojis and an overflow count.

### Selected day

Opening a day expands recorded branches and their ancestors, including saved zero and General records. Other branches remain manually expandable. Parent identities and totals expand/collapse; the direct-value control edits records. Leaf labels do not toggle entries.

Boolean values toggle immediately. Number/duration editing follows the shared rules above; Save/Delete preserves expansion. Habit creation and hierarchy editing are absent from this sheet.

## Insights

The overview ranks active roots for the current month through today by active days, typed total, and stored sibling order. Future and prior-month records are excluded.

Detail sections appear in this order:

| Section | Behavior |
| --- | --- |
| Score | Active-day percentage, with solid current and dotted previous-period series. |
| Calendar | Activity timeline whose day boxes open a larger calendar for day editing. |
| History | Separate grouped bars for exact selected habits. Each parent includes its complete branch; comparisons are never stacked or added together. Boolean values count unique active dates. |
| Best streaks | Up to five longest active-date ranges, with dates above full-width bars. |
| Frequency | Horizontally scrollable monthly weekday activity, initially ending at the current month and loading earlier months on demand. Circle size and shade reflect active days divided by possible weekdays in the full month. Future activity is excluded. |

Score and Calendar become interactive first. Fixed-height skeleton cards preserve the remaining layout until scrolling approaches History and the lower sections, which are then mounted without changing section order.

Score and History have independent multi-select filters and default to Week. Both initially select only the habit whose detail view was opened; their top-right menus let users add or hide comparison habits. Calendar, streaks, and Frequency each select one habit. Legends use habit emojis and identify parent series as branch totals. Tap History for emoji-led per-habit totals and a deduplicated list of contributing records, including direct entries at all depths and archived descendants. Wide comparisons scroll horizontally to preserve bar width. Tap Score for date/value readouts; tap a Frequency circle for its month, weekday, and active/possible count.

All five habit selectors list each parent immediately followed by its complete visible subtree, with siblings in saved order. Hidden General and archived branches are omitted. Rows share Home’s depth-based light/dark background tint, with bounded indentation and constant font size; selection remains explicit through checkboxes or radio buttons. The selector sheet adds its normal bottom spacing after the device safe-area inset so the final row stays above system navigation controls.

### Score and History periods

| Control | Score | History |
| --- | --- | --- |
| Week | Monday–Sunday | Monday–Sunday |
| Month | Days of the selected month | Months of the selected year |
| Quarter | Not offered | Eight quarters across two years |
| Year | Months of the selected year | Six annual buckets |

Both show the date range and Previous/Next controls. Next stops at the current range; changing period returns there. Score also supports horizontal gestures and accessibility navigation. History steps one week, one year, two years, or six years according to its selected period.

Keep future axis positions empty and exclude them from Score denominators. Compare incomplete Score periods with the elapsed portion of the preceding period. History axes start at zero and show meaningful typed units, including duration units and integer active-day counts.

### Detail Calendar

Initially show the end of the current month. Complete the final week through Sunday with disabled future boxes. Month labels include the year when outside the current year. Both calendar views support horizontal scrolling and accessibility month navigation, loading earlier history when needed.

Tapping any compact calendar box opens the larger calendar dialog without changing its record; there is no separate Edit button. The tapped week is centered when space permits, clamped near timeline edges, and the chosen day is outlined with its full date above the grid. The dialog has weekday labels, 44-point day targets, and a top-right close icon with a localized accessibility label. Future boxes can open the dialog but remain disabled for editing inside it.

Only the larger dialog allows day editing: Boolean days toggle direct input; number and duration days open the shared value form within the same native modal. Save, Delete, or Cancel returns to the larger calendar. Back first leaves the value form, then closes the calendar. Writes block repeated input and dismissal; failures retain the editor. Parent General routing and future-date restrictions still apply.

### Frequency timeline

Show fixed-width month columns with month/year labels and a fixed weekday key. Start with thirteen loaded months, scrolled to the newest; reaching the left edge loads twelve more months while retaining the visible position. Native horizontal scrolling provides momentum; accessibility actions navigate periods. Tapping a circle opens its monthly active/possible count. The timeline ends at the current month.

## Settings

Offer persisted appearance choices, JSON/CSV export, safe JSON import, an external AI conversion guide, and the public privacy policy. The conversion guide explains privacy and supports copying instructions; conversion happens outside the app. [Database](DATABASE.md#import-and-export) owns the transfer format.

Settings copy, action labels, dialogs, and the displayed/copied AI instructions follow the device locale: Spanish for Spanish locales, English otherwise. JSON keys and technical enum values remain unchanged for import compatibility. File/import failures show localized guidance instead of raw platform or validation errors.

## Success messages

After successful record/habit changes, briefly show a non-blocking toast with the habit emoji, name, and localized action. General changes identify the visible parent. Announce messages politely, position them above the footer or active sheet, and replace the previous toast with the newest success.
