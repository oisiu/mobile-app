# Testing

[UI and UX](UI_UX.md) defines expected behavior.

## Required gates

Run from the repository root before handoff:

| Command | Checks |
| --- | --- |
| `pnpm run doctor` | Expo configuration and native dependency compatibility |
| `pnpm verify` | Dependency version alignment, TypeScript, zero-warning ESLint, Knip, and enforced coverage |
| `pnpm test` | Complete Vitest suite |
| `pnpm build` | Production Android and iOS bundle export |
| `pnpm run audit` | Fixable high/critical production advisories, subject to configured exceptions |

[Vitest configuration](../vitest.config.ts) owns coverage scope, exclusions, and enforced thresholds. CI retains coverage reports; do not lower thresholds to pass.

## Translation verification

Whenever user-facing text is added or changed, update all supported translations (currently English and Spanish) in the same change. Use the shared translation lookup rather than hard-coded UI copy. Verify the changed text in both locales, including interpolation, symbols, related dialogs, and accessibility labels; check unsupported-language fallback where relevant. Inspect wrapping and readability on a device when practical.

## Automated coverage

The [test suite](../tests/) covers domain rules, aggregation, analytics, calendar positioning, chart scheduling, translations, and repository transactions. Repository tests run real migrations against Node's in-memory SQLite, including rollback after injected failures.

Component tests use React test renderer with mocked native hosts to cover chart labels, calendar caching and save guards, draft recovery, appearance controls, navigation, startup failures and guarded retry, and complete refresh snapshots. Palette tests check text contrast in both themes. These tests do not measure native layout or device latency.

## Integration gaps

Automated tests do not exercise native gestures/components, the Expo SQLite bridge, or platform sharing. Node SQLite tests cover branch-edit transactions and fresh migration execution; import tests cover sibling-order merges, leaf-to-General record preservation, unordered file arrays, conflicts, and injected-write rollback. Appearance tests cover the version-2 color upgrade, color persistence and inheritance, legacy emoji preservation, complete emoji sequences, editor validation, palette contrast, and chosen chart colors. Broader upgrade rollback, archive/delete, and hierarchy-change scenarios remain open. Exercise affected operations in a native build until those gaps are covered.

iOS, dark mode, large text, screen readers, narrow layouts, failure injection, and large datasets require broader device coverage. Release readiness must be checked against the signed artifact and store-delivered installation; review store artwork and release notes for every release.

## Native checklist

Check affected flows on Android and iOS, including persistence after restart. Before release, verify the installed release build; Expo Go cannot validate launcher icons or the native cold-start splash.

- **Startup:** empty install, upgrade preservation, offline use, saved appearance, icons, and splash.
- **Home and habits:** date scrolling, fixed labels, hierarchy expansion, entry editing, date moves/conflicts, draft guards, archive, and deletion.
- **Calendars:** history loading, Today, selected-day positioning, future-date restrictions, direct parent entries, editing, and Back behavior.
- **Insights:** period navigation, filters, typed totals, accessible chart values, horizontal scrolling, and deferred rendering.
- **Settings:** appearance, JSON/CSV export, safe import, conversion guide, and localized errors.
- **Resilience:** failed/repeated writes, retained drafts, cancellation, import rollback, large datasets, and restart.
- **Accessibility:** English/Spanish, light/dark themes, large text, narrow screens, safe areas, Reduce Motion, TalkBack/VoiceOver, and keyboard handling.

[UI and UX](UI_UX.md) defines expected interactions; [Database](DATABASE.md) defines data guarantees.

## CI and security

[CI](../.github/workflows/ci.yml) runs four dependent jobs in sequence: static checks; tests and coverage; project health with Doctor and dependency audit; then the Android/iOS bundle build. A final `Required CI gate` job always evaluates their results and succeeds only when all four passed; branch rules require this stable aggregate check rather than individual implementation jobs. Local required gates are listed above.

Static checks run `pnpm deps:check` against installed package versions and `pnpm expo install --check` before linting or tests. React and React test renderer must match exactly, as must Vitest and its coverage provider; missing packages fail the check. This catches incompatible updates even when component tests happen to pass. Expo validates SDK-managed package versions, and Doctor remains a separate project-health gate. These checks block the required aggregate gate and therefore Dependabot auto-merge; they do not establish native device compatibility.

[Security](../.github/workflows/security.yml) owns CodeQL, full-history Gitleaks, and zizmor scans. [Dependency review](../.github/workflows/dependency-review.yml) owns pull-request dependency checks. These workflows run independently of CI; a local quality-gate pass does not verify them. Schedules and dependency groups belong in [Dependabot configuration](../.github/dependabot.yml). [Dependabot auto-merge](../.github/workflows/dependabot-auto-merge.yml) enables squash auto-merge for patch and minor updates; major updates require manual review, and protected-branch checks remain the merge gate.

Follow the [Security policy](../SECURITY.md) for vulnerability reports and [documentation privacy guidance](DEVELOPMENT.md#documentation-privacy) before sharing evidence.
