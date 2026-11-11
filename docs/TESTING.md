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

## Automated coverage

The [suite](../tests/) is the source of truth for what is covered. It exercises:

- Domain rules: trees, aggregation, analytics, thresholds, type conversion, and import validation.
- Real SQLite migrations, upgrades/rollback, and transactional hierarchy writes.
- Provider snapshot ordering, committed-write recovery, and appearance persistence.
- Mocked-native UI: Home timeline, branch day editor, habit editor, calendars, Insights loading, popovers, hidden categories, and transfers.
- Localization: catalog checks require matching English/Spanish key and interpolation-token sets, including zero values, missing parameters, and unsupported-locale fallback.

Add a regression test with every behavior change. Update English and Spanish together for user-facing copy, dialogs, and accessibility labels.

`pnpm test:release` (also in the test/coverage gates) mocks release preparation, stage order, and credential handling. Windows shell gates use Git’s Bash. `pnpm test:release:signing` needs JDK tools/`zip` to sign and verify a synthetic archive.

## Integration gaps

Tests do not replace signed native builds, device checks, or live Play submissions. Verify gestures, SQLite bridge, sharing/cache cleanup, upgrades/rollback, and the store-installed release.

## Native checklist

Check affected Android/iOS flows and restart persistence. Before release, test the installed release build; Expo Go cannot verify launcher icons or cold-start splash.

- **Startup:** empty install, upgrade preservation, offline use, saved appearance, icons, and splash.
- **Home and habits:** date scrolling, fixed labels, hierarchy expansion, entry editing, date moves/conflicts, draft guards, legacy archive restoration, and deletion.
- **Calendars:** history loading, Today, selected-day positioning, future-date restrictions, direct parent entries, editing, and Back behavior.
- **Insights:** period navigation, filters, typed totals, accessible chart values, horizontal scrolling, and deferred rendering.
- **More:** appearance, JSON/CSV export, safe import, conversion guide, and localized errors.
- **Resilience:** failed/repeated writes, retained drafts, cancellation, import rollback, large datasets, and restart.
- **Accessibility:** English/Spanish, light/dark themes, large text, narrow screens, safe areas, Reduce Motion, TalkBack/VoiceOver, and keyboard handling.

## CI and security

[CI](../.github/workflows/ci.yml) runs static checks, coverage, Doctor/audit, and exports on PRs and `main` pushes. Require **Required CI gate** in branch rules; preserve compatibility checks/thresholds. Android release adds signing/native AAB checks after exact-commit CI; testing/production reuse that signed bundle.

[Security scans](../.github/workflows/security.yml) and [dependency review](../.github/workflows/dependency-review.yml) run separately. [Dependabot auto-merge](../.github/workflows/dependabot-auto-merge.yml) handles patch/minor updates; review majors manually.

Follow the [Security policy](../SECURITY.md) for reports and [documentation privacy guidance](DEVELOPMENT.md#documentation-privacy) before sharing evidence.
