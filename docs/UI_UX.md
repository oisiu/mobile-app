# UI and UX

This document owns durable interaction and presentation rules. [Product](PRODUCT.md) owns scope, [Database](DATABASE.md) owns data semantics, and [Architecture](ARCHITECTURE.md) owns implementation. Exact dimensions, colors, and translated strings live in the source; verification belongs in [Testing](TESTING.md).

## Shared presentation

Use system fonts, large headings with tight tracking, cream (#F3E8D7) and beige (#BAA898) grouped surfaces with mahogany (#280003) accents, reversed for the dark theme, rounded controls, and quiet separators. Keep touch feedback immediate and motion restrained. Respect safe areas and large text; keep controls accessible and chart labels readable on narrow screens. Footer destinations each keep a distinct icon and label color in both themes. Selection uses a filled icon without changing the button background. Appearance choices have visible localized labels. Destructive confirmations identify affected habits and records.

Appearance supports System, Light, and Dark. The native splash initially follows the device theme; the app applies the saved preference once loaded. The approved balance illustration retains its cream background and “Powered by PalFly” footer in both themes; the app loading image has rounded corners. Database startup failures show localized guidance and a Try again button; retries show loading and block repeated submissions. Branding assets and rebuild guidance belong in [Development](DEVELOPMENT.md#generated-android-files-and-assets).

The persistent footer offers Home, Calendar, Insights, and Settings, including on detail and editor screens. Detail selects Insights; editing selects Home. Choosing a destination dismisses those routes, subject to the draft guard below.
Footer destinations use a restrained horizontal shift. Detail and editor screens slide in from the right and reverse when returning.

## Home

- Show “Oi Siu”, a top-right New habit button, and the full localized month name; include the year outside the current year. Empty guidance points to the same add button.
- Show five day columns, initially today into the past. Horizontal date-header scrolling moves values while habit labels stay fixed. Load older dates as needed; accessibility actions also navigate dates.
- Keep the header visible while habits scroll vertically. Each habit, including expanded children, has a full-width rectangular surface band; gaps separate root groups. Indentation expresses hierarchy.
- Expanded descendants use a progressively tinted full-width surface in light and dark themes. The tint approaches a bounded shade. Indentation and name-size reduction cap after four levels to keep deep trees readable. Value font sizes stay constant.
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

New roots default to Green. Create roots with an optional emoji, name, a twelve-color palette with muted, earthy swatches that complement the cream, beige and mahogany theme, and a localized type choice with an example. A compact button showing only a color circle sits on the same row as the emoji and name for roots and children. Its accessible label identifies the selected color; tapping it expands the palette below the row. Palette options show only color circles; localized accessible labels identify each choice. Selecting a color or Automatic collapses the palette; tapping the button again also closes it. Automatic resets the color to the nearest ancestor’s choice, or the default accent for roots. Children may override that color. Readable accent variants of the selected colors appear as subtle Home accents, Calendar markers, overview bars, and detail chart series; names and emojis remain visible alongside color.

Emoji input allows an empty field or one complete emoji, including flags, skin tones, keycaps, and joined family sequences. Save rejects multiple emojis with localized feedback and retains the draft. Existing multiple-emoji values remain unchanged when editing other fields; changing the emoji applies the new rule. Editing a descendant opens its root's hierarchy editor. New children inherit the branch type; there is no parent selector.

Back, Cancel, native back gestures, and footer navigation confirm before discarding changed drafts. Unchanged or fully reverted drafts leave immediately; successful Save does not prompt. Cancel returns to Home, including when the editor was opened directly without a previous route.

Descendant deletions are staged after impact confirmation; Save commits the hierarchy edits together. Root archive and confirmed permanent deletion are separate actions. Successful root deletion returns to Home without leaving a stale detail/editor in the Back stack.

Insight detail places Back, the wrapping habit title, and an accessible edit button in its header.

Navigation shows immediate progress, exposes its pending state to accessibility services, and rejects repeated taps. Insight detail shows its header and static chart placeholders during the opening transition, then reveals Score and Calendar. Reduce Motion disables fades. The larger calendar also shows a static placeholder while opening and renders the selected weeks first.

## Entry editing and sheets

Direct parent input targets its hidden General record and preserves descendant entries. The Home branch day editor above separately allows reviewing, editing, removing, and moving descendant records. Displayed parent activity may therefore remain after deleting direct input; [Database](DATABASE.md) defines aggregation.

Number/duration editors are keyboard-aware and offer Save, Delete for an existing record, and Cancel or Back. Duration input accepts decimal Minutes/Hours and preserves the amount when units change. Whole-hour values initially use Hours; other values use Minutes. Zero is valid. Compact duration displays round to the nearest minute, carrying rounded minutes into hours.

Writes block repeated submission and conflicting dismissal/filter changes. Failed writes retain the draft and show an error. Successful writes refresh displayed values.

Day sheets and Insight filters dismiss through the Close handle, backdrop, Android Back, or accessibility escape. The handle is a button. In a Calendar day draft, Back/escape first returns to the day sheet.

## Calendar tab

Months scroll vertically and load older history. A Monday-first weekday row, month/year headings with only a space between the localized month and year (for example, “September 2026” / “Septiembre 2026”), Today shortcut, and highlighted current day orient navigation. Future days are disabled. Day cells with positive activity use the same parent color as the overview charts at 30% opacity so emojis remain readable. Days with several active parents divide the background into equal radial sectors like a pie chart, using all contributing colors. Date and overflow text use the theme foreground; zero records do not color a cell. Today retains a contrasting outline. Cells show up to three distinct active root emojis without underlines and an overflow count; accessibility names identify all contributing roots.

### Selected day

Opening a day expands recorded branches and their ancestors, including saved zero and General records. Other branches remain manually expandable. Parent identities and totals expand/collapse; the direct-value control edits records. Leaf labels do not toggle entries.

Boolean values toggle immediately. Number/duration editing follows the shared rules above; Save/Delete preserves expansion. Habit creation and hierarchy editing are absent from this sheet.

## Insights

The overview offers Week, Month, and Year, defaulting to Month. Week uses Monday through today; Month uses the first day of the month through today; Year uses January 1 through today. A pie chart shows the share of parent active days for each visible root, including descendants and counting each branch once per date. Mixed types use active days rather than combining quantities and seconds. Automatic series colors follow stored root order, so activity ranking and period changes do not swap colors. Below the chart, visible parent habits appear in a two-column grid in stored sibling order. Overview weekly headings and chart navigation show only the date range (5-11/10/2026), without an ISO week number or preceding year. Month names in period headings and captions start with a capital letter. A period heading uses the week date range, localized month/year, or year, followed by Active days. Each tile shows the parent emoji, name and active/elapsed-day count and opens its detail. A wrapping legend below the pie identifies each visible root by its color, emoji and name, including inactive roots. Contribution percentages appear inside their pie sectors, centered on each angular midpoint; a single 100% sector uses the center. Zero contributions have no sector or label. Current denominators grow daily; completed periods use all seven week days, calendar month days, or 365/366 year days. Inactive habits remain at 0%. An empty chart explains that the period has no activity. Previous/Next arrows move one week, month, or year. Historical periods include their full range; current periods stop at today. A caption identifies the week/date range, month/year, or year. Next stops at the current period and changing tabs resets there. Future and earlier-period records are excluded.

Below the overview parent grid, Score compares independent parent strength curves using their associated colors. Its filter includes only visible root habits and supports one, several, or all (default), retaining at least one selection. A colored legend identifies each selected curve. The shared detail score chart is used without a single-habit summary. Week and Month show daily values; the overview Year tab uses the detail Quarter window of twelve monthly averages, with a month label every three months and year boundaries. All overview charts share the top Week/Month/Year selector and period navigation; changing the period resets to the current window. Category filters remain independent.

The final overview chart is History, with independent root-only multi-selection (one, several, or all) and legend colors. It follows the shared Week/Month/Year selector, with Year using the twelve-month Quarter window of detail History; Month retains a bar position for every calendar day, including empty/future positions. To compare heterogeneous root types, overview History stacks independent root active-day counts rather than adding quantities to duration seconds. Each root counts once per active date; detail History retains typed units and its overlapping-branch rules.

Detail sections appear in this order:

| Section | Behavior |
| --- | --- |
| Score | Habit strength from 0–100%, rising with activity and gradually decaying on missed days, with independent period windows and navigation. |
| Calendar | Activity timeline whose day boxes open a larger calendar for day editing. |
| History | One stacked bar per period. Records belong to the deepest selected habit; parents retain only contributions not assigned to selected descendants. Boolean dates count once, split equally among active selected segments. |
| Best streaks | Up to five longest active-date ranges, with dates above full-width bars. |
| Frequency | Horizontally scrollable monthly weekday activity, initially ending at the current month and loading earlier months on demand. Circle size and shade reflect active days divided by possible weekdays in the full month. Future activity is excluded. |

Score and Calendar become interactive first. Fixed-height skeleton cards preserve the remaining layout until scrolling approaches History and the lower sections, which are then mounted without changing section order.

Score and History have independent multi-select filters. Both default to Week. Opening a different habit resets the detail filters and chart periods to their defaults. Both initially select only the habit whose detail view was opened; their top-right menus let users add or hide comparison habits. Calendar, streaks, and Frequency each select one habit. Legends use habit emojis and names. History includes direct entries at all depths and archived descendants without counting any record twice. Bars do not open explanatory text or record lists. History omits the active-day unit caption and comparison guidance; duration units remain visible. Month mode fits all calendar days within the card and skips day labels as needed to avoid crowding. Frequency circles are non-interactive; their month, weekday, and active/possible counts remain available to screen readers.

All five habit selectors list each parent immediately followed by its complete visible subtree, with siblings in saved order. Hidden General and archived branches are omitted. Rows share Home’s depth-based light/dark background tint, with bounded indentation and constant font size; selection remains explicit through checkboxes or radio buttons. The selector sheet adds its normal bottom spacing after the device safe-area inset so the final row stays above system navigation controls.

### Score timeline

Score starts at zero. Any positive branch activity counts once per day for all habit types, including direct and archived descendant records. Daily exponential smoothing has a thirteen-day half-life: thirteen consecutive active days reach 50% from zero; thirteen missed days halve the existing score. The score carries across all history and never resets at a period boundary. No targets or schedules are implied.

Score Week shows Monday–Sunday daily scores, with only the full date range below the x-axis (for example, 5-11/10/2026), matching the overview. Month shows daily scores for one calendar month, initially the current month, with its localized name and year; arrows move one month. Quarter shows monthly averages for the latest twelve months including the selected month, with a localized month label every three months and years at year boundaries; arrows move twelve months and the caption identifies the month/year range. Year retains six annual averages and six-year navigation. Week arrows move one week. Next stops at the current range, and changing period resets to it. Current buckets stop at today and future positions remain empty. Each selected habit keeps its own line, with dots and a fixed percentage axis. Y-axis labels use compact `N%` text in a dedicated left gutter outside the plot. Dots do not open readouts, and no habit-name legend appears below the Score heading. Values remain available to screen readers.

Above the plot, show the opened habit’s current strength, changes since 30 and 365 days ago, and total unique active dates through today. Changes are percentage-point differences, displayed with a sign. These summary values stay anchored to today while browsing older periods or comparing habits.

### History periods

Week shows Monday–Sunday, Month shows each day of one calendar month, Quarter shows twelve monthly buckets ending with the selected month, and Year shows six annual buckets. Previous/Next step one week, one month, twelve months, or six years respectively. Next stops at the current range; changing period returns there.

Week navigation shows only the full date range, matching Score and the overview. Month shows its localized name and year, Year shows the selected year, and Quarter shows its month/year range. Quarter x-axis labels show one localized month name every three months while retaining all twelve monthly bars, with the full year on a second line at the first month and each year change.

Monthly axes retain the first and last day labels and omit nearby intermediate labels to keep the final day readable. Keep future axis positions empty. History axes start at zero and show meaningful typed units, including duration units and integer active-day counts.

### Detail Calendar

Initially show the end of the current month. Complete the final week through Sunday with disabled future boxes. Month labels include the year when outside the current year. Both calendar views support horizontal scrolling and accessibility month navigation, loading earlier history when needed.

Tapping any compact calendar box opens the larger calendar dialog without changing its record; there is no separate Edit button. The tapped week is centered when space permits, clamped near timeline edges, and the chosen day is outlined with its full date above the grid. The dialog has weekday labels, 44-point day targets, and a top-right close icon with a localized accessibility label. Future boxes can open the dialog but remain disabled for editing inside it.

Only the larger dialog allows day editing: Boolean days toggle direct input; number and duration days open the shared value form within the same native modal. Save, Delete, or Cancel returns to the larger calendar. Back first leaves the value form, then closes the calendar. The tapped day shows a pending indicator while saving. Writes block repeated input and dismissal; failures retain the editor. Parent General routing and future-date restrictions still apply.

### Frequency timeline

Show fixed-width month columns with abbreviated localized month names and the full year on a second line at the first month and each year boundary, matching Quarter History. Keep a fixed weekday key. Start with thirteen loaded months, scrolled to the newest; reaching the left edge loads twelve more months while retaining the visible position. Native horizontal scrolling provides momentum; accessibility actions navigate periods. Tapping a circle does nothing. The timeline ends at the current month.

## Settings

Offer persisted appearance choices, JSON/CSV export, safe JSON import, an external AI conversion guide, and the public privacy policy. The conversion guide explains privacy and supports copying instructions; conversion happens outside the app. [Database](DATABASE.md#import-and-export) owns the transfer format.

Settings copy, action labels, dialogs, and the displayed/copied AI instructions follow the device locale: Spanish for Spanish locales, English otherwise. JSON keys and technical enum values remain unchanged for import compatibility. File/import failures show localized guidance instead of raw platform or validation errors.

## Success messages

After successful record/habit changes, briefly show a non-blocking toast with the habit emoji, name, and localized action. General changes identify the visible parent. Announce messages politely, position them above the footer or active sheet, and replace the previous toast with the newest success.
