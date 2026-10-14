# UI and UX

This document owns durable interaction and presentation rules. [Product](PRODUCT.md) owns scope, [Database](DATABASE.md) owns data semantics, and [Architecture](ARCHITECTURE.md) owns implementation. Exact dimensions, colors, and translated strings live in the source; verification belongs in [Testing](TESTING.md).

## Data export

More → Data offers an expandable export scope picker, defaulting to All habits. It lists root categories in saved order, including hidden and archived categories, with archived labels. Selecting a category includes its subhabits and full history in either JSON or CSV. Scope selection and export buttons are disabled while a file is being prepared or shared.

## Shared presentation

Use system fonts, large headings with tight tracking, cream (#F3E8D7) and beige (#C7B7A7) grouped surfaces with mahogany (#280003) accents, rounded controls, and quiet separators. Dark mode uses warm charcoal with a subtle mahogany tint, progressively lighter card and nested surfaces, cream text, and soft cream action accents. Keep text and secondary labels readable across all surface layers. Keep touch feedback immediate and motion restrained. Respect safe areas and large text; keep controls accessible and chart labels readable on narrow screens. Footer destinations each keep a distinct icon and label color in both themes. Selection uses a filled icon without changing the button background. Appearance choices have visible localized labels. Destructive confirmations identify affected habits and records.

Appearance supports System, Light, and Dark. Database startup failures show localized guidance and a Try again button; retries show loading and block repeated submissions. Branding assets and rebuild guidance belong in [Development](DEVELOPMENT.md#generated-android-files-and-assets).

The persistent footer offers Home, Calendar, Insights, and More, including on detail and editor screens. Detail selects Insights; editing selects Home. Choosing a destination dismisses those routes, subject to the draft guard below.
Footer destinations use a restrained horizontal shift. Detail and editor screens slide in from the right and reverse when returning.

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

Use visual associations and simple words: the habit emoji/name and date, emoji-led record rows, switches or numeric inputs, and a compact **Now → After saving** preview. Small ancestry labels disambiguate repeated names; direct parent records use the parent's emoji and “Direct entry.” Avoid explanatory paragraphs in routine flows.

Switch off individual records or use **Clear day**; nothing is written until **Save**. Duration rows offer Minutes/Hours with value-preserving conversion. **Cancel**, Close, Back, and the backdrop discard the draft. Save updates retained values and deletes switched-off records together. Other dates and branches are unchanged. Zero remains a valid stored value. Numeric/duration users can open the parent's direct-entry form inside the same modal when the branch draft is unchanged.

**Move day** reveals a visual month picker with future dates disabled. Selecting a destination collapses the picker and shows the destination date and record count; the source-day preview becomes empty. Save moves retained records and deletes switched-off ones atomically. A destination entry for the same habit, including zero, blocks the move and appears with its emoji/name/value. Users choose another date or cancel and edit the destination first; nothing is overwritten or merged. Canceling the date choice restores the source date.

Writes block repeated input and dismissal. Failures retain the draft. Changed source records cause a stale-draft error; reopening refreshes the snapshot.

## Habit editor

New roots default to Green. Create roots with an optional emoji, name, a twelve-color palette with muted, earthy swatches that complement the cream, beige and mahogany theme, and a localized type choice with an example. A compact button showing only a color circle sits on the same row as the emoji and name for roots and children. Its accessible label identifies the selected color; tapping it expands the palette below the row. Palette options show only color circles; localized accessible labels identify each choice. Selecting a color or Automatic collapses the palette; tapping the button again also closes it. Automatic resets the color to the nearest ancestor’s choice, or the default accent for roots. Children may override that color. Readable accent variants of the selected colors appear as subtle Home accents, Calendar markers, overview bars, and detail chart series; names and emojis remain visible alongside color.

Emoji input allows an empty field or one complete emoji, including flags, skin tones, keycaps, and joined family sequences. Save rejects multiple emojis with localized feedback and retains the draft. Existing multiple-emoji values remain unchanged when editing other fields; changing the emoji applies the new rule. Editing a descendant opens its root's hierarchy editor. New children inherit the branch type. At the root and every draft child, Add existing categories opens a disclosure of compatible active categories from other branches, identified by their full ancestry path. Selection stages the complete subtree under that destination and removes it from subsequent choices; ancestors, descendants already in the draft, General records, and incompatible or archived categories cannot be selected. Newly created roots and children can receive existing categories. Removing an attached subtree from the draft cancels its move without deleting records; its existing descendants cannot be deleted through this attachment flow. Changing a new root's type clears the staged children. Save commits creation, edits and attachments together; Cancel leaves all original branches unchanged. Moved roots follow their new root's visibility preferences. Home displays the saved grouping after refresh.

Back, Cancel, native back gestures, and footer navigation confirm before discarding changed drafts. Unchanged or fully reverted drafts leave immediately; successful Save does not prompt. Cancel returns to Home, including when the editor was opened directly without a previous route.

Descendant deletions are staged after impact confirmation; Save commits the hierarchy edits together. Root archive and confirmed permanent deletion are separate actions. Successful root deletion returns to Home without leaving a stale detail/editor in the Back stack.

Insight detail places Back, the wrapping habit title, and an accessible edit button in its header.

Navigation shows immediate progress, exposes its pending state to accessibility services, and rejects repeated taps. Insight detail shows its header and static chart placeholders during the opening transition, then reveals Consistency and Calendar. Reduce Motion disables fades. The larger calendar also shows a static placeholder while opening and renders the selected weeks first.

Quantity and duration roots and children can optionally set a calendar color threshold during creation or hierarchy editing. Duration thresholds use Minutes/Hours with value-preserving unit conversion; stored values use integer seconds. Blank removes the rule; values must be positive. Threshold changes participate in the draft guard and hierarchy transaction. Rules are per habit, without inheritance.

### Changing a habit type

The root hierarchy editor offers Change habit type. The selection applies to the whole original branch, including General and archived descendants, and participates in the unsaved-draft guard. Changing type clears pending category attachments and existing calendar color thresholds; reverting the selection restores the previous draft thresholds. Compatible categories can then be attached using the target type, and their existing values are retained.

Boolean → Quantity or Duration requires a non-negative value for each historical Yes. Saved No records remain zero; missing dates remain empty. Duration supports Minutes/Hours with value-preserving conversion and whole-second validation. Categories without historical records need no conversion value; the warning explains that only the branch type will change. Quantity or Duration → Boolean permanently maps every stored record, including zero, to Yes, matching Activity analysis. The warning explains that original numeric values cannot be recovered by converting back. Quantity ↔ Duration asks for the duration equivalent to one quantity unit and converts values proportionally; duration results round to the nearest second.

Save first validates the draft, then requires a localized warning with the category, branch size, record count, target type and relevant conversion value. Canceling or dismissing the warning writes nothing. Confirmation and writes block duplicate saves and route dismissal; successful saves release the draft guard. Conversion, hierarchy edits, new children and compatible attachments are committed together. Changed branch membership or reviewed records reject the save with localized guidance. Boolean categories show only their Boolean analysis, without an Activity mode selector.

## Entry editing and sheets

Direct parent input targets its hidden General record and preserves descendant entries. The Home branch day editor above separately allows reviewing, editing, removing, and moving descendant records. Displayed parent activity may therefore remain after deleting direct input; [Database](DATABASE.md) defines aggregation.

Number/duration editors are keyboard-aware and offer Save, Delete for an existing record, and Cancel or Back. Duration input accepts decimal Minutes/Hours and preserves the amount when units change. Whole-hour values initially use Hours; other values use Minutes. Zero is valid. Compact duration displays round to the nearest minute, carrying rounded minutes into hours.

Writes block repeated submission and conflicting dismissal/filter changes. Failed writes retain the draft and show an error. Successful writes refresh displayed values.

Day sheets and Insight filters dismiss through the Close handle, backdrop, Android Back, or accessibility escape. The handle is a button. In a Calendar day draft, Back/escape first returns to the day sheet.

## Calendar tab

Months scroll vertically and load older history. A Monday-first weekday row, month/year headings with only a space between the localized month and year (for example, “September 2026” / “Septiembre 2026”), Today shortcut, and highlighted current day orient navigation. Future days are disabled. Day cells with positive activity use the same parent color as the overview charts at 30% opacity. Days with several active parents divide the background into equal radial sectors like a pie chart, using all contributing colors. Dates use the theme foreground; zero records do not color a cell. Today retains a contrasting outline. Cells show only the date, with no habit emojis or overflow count; accessibility names identify all contributing roots.

### Selected day

Opening a day shows all visible root categories collapsed, including those without activity. Only the arrow on a parent row expands/collapses its children; child parents use the same arrows to reveal grandchildren at any depth. Root totals still include descendant and General records. Switching or reopening a day resets all expansion. The direct-value control edits records; labels do not expand branches or toggle entries.

Boolean values toggle immediately. Number/duration editing follows the shared rules above; Save/Delete preserves expansion. Habit creation and hierarchy editing are absent from this sheet.

## Insights

The overview offers Week, Month, and Year, defaulting to Month. Week uses Monday through today; Month uses the first day of the month through today; Year uses January 1 through today. A pie chart shows the share of parent active days for each visible root, including descendants and counting each branch once per date. Its category filter supports one, several, or all roots (default), retaining at least one selection. Percentages, sectors, accessible values, and the legend use only selected categories; the denominator is their combined active-day count. Selections survive period navigation and stay independent from the parent grid, Consistency, and History filters. If all selected roots disappear, the filter returns to all available roots. Mixed types use active days rather than combining quantities and seconds. Automatic series colors follow stored root order, so activity ranking and period changes do not swap colors. Below the chart, visible parent habits appear in a three-column grid in stored sibling order, wrapping into as many rows as needed. Overview weekly headings and chart navigation show only the date range (5-11/10/2026), without an ISO week number or preceding year. Month names in period headings and captions start with a capital letter. A period heading uses the week date range, localized month/year, or year, followed by Active days. Each tile shows the parent emoji, name and active/elapsed-day count and opens its detail. A wrapping legend below the pie identifies only roots contributing a visible slice in the selected period, by color and name, in stored sibling order. Empty periods have no legend items; inactive roots remain in the parent grid below. Contribution percentages appear inside their pie sectors, centered on each angular midpoint; a single 100% sector uses the center. Zero contributions have no sector or label. Current denominators grow daily; completed periods use all seven week days, calendar month days, or 365/366 year days. Inactive habits remain at 0%. An empty chart explains that the period has no activity. Previous/Next arrows move one week, month, or year. Historical periods include their full range; current periods stop at today. A caption identifies the week/date range, month/year, or year. Next stops at the current period and changing tabs resets there. Future and earlier-period records are excluded.

Below the overview parent grid, Consistency compares independent parent strength curves using their associated colors. Its filter includes only visible root habits and supports one, several, or all (default), retaining at least one selection. A colored legend identifies each selected curve. General Analysis legends appear below their graphs, matching the pie chart, and show names without emojis. Legend buttons use compact padding and spacing, with extra vertical touch reach. Tapping a pie sector, Consistency curve, History segment, or its legend category highlights its pie sector, Consistency curve or History segments and dims the other categories in that chart without changing filters or values; tapping it again clears the highlight. Each chart has independent highlighting. A highlight is inactive if its category is absent from the current chart. Individual analysis legends retain their existing presentation. The shared detail score chart is used without a single-habit summary or point markers; overview curves use continuous lines and retain legend highlighting. Week and Month show daily values; the overview Year tab uses its existing twelve-month window of monthly averages, with a month label every three months and year boundaries. All overview charts share the top Week/Month/Year selector and period navigation; changing the period resets to the current window. Category filters remain independent.

The final overview chart is History, with independent root-only multi-selection (one, several, or all) and legend colors. It follows the shared Week/Month/Year selector, with Year using its existing twelve-month history window; Month retains a bar position for every calendar day, including empty/future positions. To compare heterogeneous root types, overview History stacks independent root active-day counts rather than adding quantities to duration seconds. Each root counts once per active date; detail History retains typed units and its overlapping-branch rules.

Quantity and duration detail screens place two accessible mode buttons above the charts: Quantity or Duration (initially selected) and Activity. The selection applies to Calendar, History, Best streaks, and Frequency, including comparison filters and the enlarged calendar. Boolean analysis treats any quantity/duration record, including zero, as activity; overlapping branch records count only once per date. Calendar editing still uses the original quantity/duration form. Switching modes preserves chart periods and selections; opening another habit starts in its original type. Consistency always uses the original positive-value activity records, including its total and summary, so switching modes never changes consistency values. Boolean categories need no mode selector.

Each detail chart title has a small accessible information button that opens a localized explanation with a Close action. Consistency help explains gradual decay, carry-over between periods, the thirteen-day half-life, and the summary anchored to today. Calendar, History, Best streaks, and Frequency explain their respective units and interactions.

Detail sections appear in this order:

| Section      | Behavior                                                                                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consistency        | Habit strength from 0–100%, rising with activity and gradually decaying on missed days, following the shared detail period and navigation.                                                                                                              |
| Calendar     | Activity timeline whose day boxes open a larger calendar for day editing.                                                                                                                                                                            |
| History      | One stacked bar per period. Records belong to the deepest selected habit; parents retain only contributions not assigned to selected descendants. Boolean dates count once, split equally among active selected segments.                            |
| Best streaks | Up to five longest active-date ranges within the shared period, with dates above full-width bars.                                                                                                                                                                             |
| Frequency    | Weekday activity in columns defined by the shared period. Circle size and shade reflect active days divided by elapsed matching weekdays in each column. Future dates are excluded. |

Consistency and Calendar become interactive first. Fixed-height skeleton cards preserve the remaining layout until scrolling approaches History and the lower sections, which are then mounted without changing section order.

Detail analysis has one shared Week/Month/Year selector above all charts, with a More periods button offering Quarter and All history. A shared caption identifies the selected dates or year; Quarter and All history show their names explicitly. Previous/Next move one week, month, natural three-month quarter, or calendar year, stopping at the current period. All history includes every year from the first stored record through today, with horizontal scrolling for long charts and no date arrows. Opening another habit resets to Week and today. The Calendar retains independent navigation and editing.

Consistency and History keep independent comparison filters, initially selecting the opened habit. Week and Month have daily buckets; Quarter has three natural calendar months; Year has twelve calendar months; All history has annual buckets. History sums values; Consistency averages daily scores for grouped buckets. Consistency summaries remain anchored to today. Best streaks are limited and clipped to the selected interval. Frequency uses weekday rows with one column for Week/Month, monthly columns for Quarter/Year, and annual columns for All history; counts and denominators use elapsed dates inside the selected interval, excluding future days. Its horizontal scroll only browses columns in that interval.

Legends appear below their graphs and use habit emojis and names. History includes direct entries at all depths and archived descendants without counting any record twice. Bars do not open explanatory text or record lists. History omits the active-day unit caption; duration units remain visible. Month mode fits all calendar days within the card and skips day labels as needed. Frequency circles are non-interactive; their weekday and active/possible counts remain available to screen readers.

All five habit selectors list each parent immediately followed by its complete visible subtree, with siblings in saved order. Hidden General and archived branches are omitted. Rows share Home’s depth-based light/dark background tint, with bounded indentation and constant font size; selection remains explicit through checkboxes or radio buttons. The selector sheet adds its normal bottom spacing after the device safe-area inset so the final row stays above system navigation controls.

### Consistency timeline

Consistency starts at zero. Any positive branch activity counts once per day for all habit types, including direct and archived descendant records. Daily exponential smoothing has a thirteen-day half-life: thirteen consecutive active days reach 50% from zero; thirteen missed days halve the existing score. The score carries across all history and never resets at a period boundary. No targets or schedules are implied.

Consistency follows the shared detail period and navigation described above. Each selected habit keeps its own line, with dots and a fixed percentage axis. Y-axis labels use compact `N%` text in a dedicated left gutter outside the plot. Dots do not open readouts. Values remain available to screen readers.

Above the plot, show the opened habit’s current strength, changes since 30 and 365 days ago, and total unique active dates through today. Changes are percentage-point differences, displayed with a sign. These summary values stay anchored to today while browsing older periods or comparing habits.

### Detail Calendar

Initially show the end of the current month. Complete the final week through Sunday with disabled future boxes. Month labels include the year when outside the current year. Both calendar views support horizontal scrolling and accessibility month navigation, loading earlier history when needed.

Tapping any compact calendar box opens the larger calendar dialog without changing its record; there is no separate Edit button. The tapped week is centered when space permits, clamped near timeline edges, and the chosen day is outlined with its full date above the grid. The dialog has weekday labels, 44-point day targets, and a top-right close icon with a localized accessibility label. Future boxes can open the dialog but remain disabled for editing inside it.

Only the larger dialog allows day editing: Boolean days toggle direct input; number and duration days open the shared value form within the same native modal. Save, Delete, or Cancel returns to the larger calendar. Back first leaves the value form, then closes the calendar. The tapped day shows a pending indicator while saving. Writes block repeated input and dismissal; failures retain the editor. Parent General routing and future-date restrictions still apply.

The detail Calendar uses a fixed 30% color fill for active dates whose original aggregated quantity/duration is strictly below the selected habit’s threshold, and full fill at or above it. This applies to compact and enlarged calendars in both analysis modes. Rules use the original values, including descendant totals. Low-fill cells use readable theme text and accessible below-threshold labels. Existing inactive/future styling stays intact. Thresholds change appearance only: records, activity, consistency, streaks, and other charts are unaffected.

### Frequency timeline

Show fixed-width columns for the shared period, with localized month abbreviations or annual labels as appropriate and a weekday key. Horizontal scrolling browses all columns in that interval; it does not load dates outside it. Tapping a circle does nothing. Accessibility labels include the column, weekday, and active/possible counts.

## More

Group More into titled Appearance, Data, and Help & about sections. Offer persisted appearance choices, JSON/CSV export, safe JSON import, and an external AI conversion guide. Help & about links to the public terms and conditions, privacy policy, support page, and app GitHub repository. Legal and support pages follow the device locale (English or Spanish). External links open only after a tap, expose link semantics and a localized browser hint, and show localized guidance if opening fails. The conversion guide keeps its copy and close actions outside the scrolling prompt, avoids the keyboard, and includes bottom safe-area padding. It explains privacy and supports copying instructions; conversion happens outside the app. [Database](DATABASE.md#import-and-export) owns the transfer format.

More copy, action labels, dialogs, and the displayed/copied AI instructions follow the device locale: Spanish for Spanish locales, English otherwise. JSON keys and technical enum values remain unchanged for import compatibility. File/import failures show localized guidance instead of raw platform or validation errors.

A collapsed-by-default Advanced settings disclosure exposes its expanded state to accessibility services and reveals deletion guidance and the Delete all data button. The button requires three cancelable confirmation dialogs before removing all habits (including archived habits) and records. The final dialog shows counts excluding hidden General habits. Deletion blocks repeated taps; failures show localized guidance. Appearance preferences and externally exported copies remain.

## Category visibility

Root creation and hierarchy editing offer “Hide from general analysis”, off by default. The switch applies only to the root, never to child rows. Hidden roots remain in Today and open their individual analysis normally; the general Analysis grid, pie, Consistency, History and all their filters exclude them. Turning the switch off restores overview eligibility. Visibility changes participate in the unsaved-draft guard.

Root creation and hierarchy editing also offer “Hide completely”, off by default and independent of “Hide from general analysis”. Complete hiding covers the root and all descendants. They are excluded from the main Today list, all Analysis screens and filters, and calendar cells/day sheets. A direct hidden Insight route shows the unavailable-category state. In More, within Data, below the import/export controls, a collapsed “Hidden categories” card lists hidden roots in stored order with their emoji and name. Names open the hierarchy editor. A separate eye button restores each category, preserving the overview-only preference; failures retain the row and duplicate submissions are blocked. Empty collections omit the card. In Today, holding the Oi Siu title for three seconds reveals the same card, initially expanded, at the bottom of the habit list; another three-second hold hides it. An accessibility action also toggles the section. It starts hidden when Home mounts. The complete-hiding switch explains both access paths in English and Spanish. Hiding again requires the editor switch. Records remain stored and included in exports. Archived categories remain governed by archive visibility.

## Success messages

After successful record/habit changes, briefly show a non-blocking toast with the habit emoji, name, and localized action. General changes identify the visible parent. Announce messages politely, position them above the footer or active sheet, and replace the previous toast with the newest success.
