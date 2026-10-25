# Testing

[UI and UX](UI_UX.md) defines expected behavior.

## Required gates

Run from the repository root before handoff:

| Command | Checks |
| --- | --- |
| `pnpm run doctor` | Expo configuration and native dependency compatibility |
| `pnpm verify` | Dependency version alignment, TypeScript, zero-warning ESLint, Knip, and enforced coverage |
| `pnpm test` | App and release test suites |
| `pnpm build` | Production Android and iOS bundle export |
| `pnpm run audit` | Fixable high/critical production advisories, subject to configured exceptions |
| `git diff --check` | Whitespace errors |

[Vitest configuration](../vitest.config.ts) owns coverage scope, exclusions, and enforced thresholds. CI retains coverage reports; do not lower thresholds to pass.

## Translation verification

Update English/Spanish together for user-facing copy, dialogs, and accessibility labels, using shared translation lookups. Verify interpolation, symbols, related text, and unsupported-language fallback; inspect device wrapping/readability when practical.

## Automated coverage

The [suite](../tests/) covers domain rules, real SQLite migrations/rollback, safe transfer/cache cleanup, localization, and mocked-native UI behavior.

Popover checks cover trigger placement, safe-area/keyboard bounds, reopening/cleanup, inside/outside taps, Back/escape, and pending-write dismissal. Shared popovers, filters, and attachments are in enforced coverage.

UI checks cover draft/navigation guards, duplicate writes, refresh-only recovery, hidden-category restoration, and transfer failures. Analytics cover independent grouping/history, weekly boundaries, totals/streaks/frequency, Activity mode, thresholds, and accessible values. Calendar checks cover multi-selection, branch/color deduplication, descendant color priority, original-value thresholds, selection recovery, and editing targets.

`pnpm test:release` (also in test/coverage gates) mocks release preparation, stage order, and credential handling. Windows shell gates use Git’s Bash. `pnpm test:release:signing` needs JDK tools/`zip` to sign and verify a synthetic archive.

## Integration gaps

Tests do not replace signed native builds, device checks, or live Play submissions. Verify gestures, SQLite bridge, sharing/cache cleanup, upgrades/rollback, and the store-installed release.

## Native checklist

Check affected Android/iOS flows and restart persistence. Before release, test the installed release build; Expo Go cannot verify launcher icons or cold-start splash.

- **Startup:** empty install, upgrade preservation, offline use, saved appearance, icons, and splash.
- **Home and habits:** date scrolling, fixed labels, hierarchy expansion, entry editing, date moves/conflicts, draft guards, archive, and deletion.
- **Calendars:** history loading, Today, selected-day positioning, future-date restrictions, direct parent entries, editing, and Back behavior.
- **Insights:** period navigation, filters, typed totals, accessible chart values, horizontal scrolling, and deferred rendering.
- **More:** appearance, JSON/CSV export, safe import, conversion guide, and localized errors.
- **Resilience:** failed/repeated writes, retained drafts, cancellation, import rollback, large datasets, and restart.
- **Accessibility:** English/Spanish, light/dark themes, large text, narrow screens, safe areas, Reduce Motion, TalkBack/VoiceOver, and keyboard handling.

## CI and security

[CI](../.github/workflows/ci.yml) runs static checks, coverage, Doctor/audit, and exports on PRs and `main` pushes. Require **Required CI gate** in branch rules; preserve compatibility checks/thresholds. Android release adds signing/native AAB checks after exact-commit CI; testing/production reuse that signed bundle.

[Security scans](../.github/workflows/security.yml) and [dependency review](../.github/workflows/dependency-review.yml) run separately. [Dependabot auto-merge](../.github/workflows/dependabot-auto-merge.yml) handles patch/minor updates; review majors manually.

Follow the [Security policy](../SECURITY.md) for reports and [documentation privacy guidance](DEVELOPMENT.md#documentation-privacy) before sharing evidence.
