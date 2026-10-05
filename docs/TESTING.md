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

Whenever user-facing text is added or changed, update all supported translations (currently English and Spanish) in the same change. Use the shared translation lookup rather than hard-coded UI copy. Verify the changed text in both locales, including interpolation, symbols, related dialogs, and accessibility labels; check unsupported-language fallback where relevant. Inspect wrapping and readability on a device when practical.

## Automated coverage

The [test suite](../tests/) covers domain rules, real SQLite migrations/transactions, translations, and UI behavior with mocked native components.

More tests cover navigation accessibility in both themes, data transfer, clipboard failures, and deletion safeguards. Repository tests verify deletion rollback and retained migration history.

`pnpm test:release` checks release preparation, stage order, and credential handling with mocked services. Shell gates use Bash from the installed Git distribution on Windows. It also runs in `pnpm test` and coverage checks. `pnpm test:release:signing` uses JDK tools and `zip` to sign and verify a temporary synthetic archive.

## Integration gaps

Automated tests do not replace signed native builds, device testing, or live Play submissions. Native gestures, the Expo SQLite bridge, sharing, and broader upgrade/rollback scenarios need device verification. Check affected flows and the store-delivered installation before release.

## Native checklist

Check affected flows on Android and iOS, including persistence after restart. Before release, verify the installed release build; Expo Go cannot validate launcher icons or the native cold-start splash.

- **Startup:** empty install, upgrade preservation, offline use, saved appearance, icons, and splash.
- **Home and habits:** date scrolling, fixed labels, hierarchy expansion, entry editing, date moves/conflicts, draft guards, archive, and deletion.
- **Calendars:** history loading, Today, selected-day positioning, future-date restrictions, direct parent entries, editing, and Back behavior.
- **Insights:** period navigation, filters, typed totals, accessible chart values, horizontal scrolling, and deferred rendering.
- **More:** appearance, JSON/CSV export, safe import, conversion guide, and localized errors.
- **Resilience:** failed/repeated writes, retained drafts, cancellation, import rollback, large datasets, and restart.
- **Accessibility:** English/Spanish, light/dark themes, large text, narrow screens, safe areas, Reduce Motion, TalkBack/VoiceOver, and keyboard handling.

[Database](DATABASE.md) defines data guarantees.

## CI and security

[CI](../.github/workflows/ci.yml) runs static checks, tests/coverage, Doctor/audit, and bundle exports. Require its aggregate **Required CI gate** in branch rules. Keep dependency compatibility checks and coverage thresholds enabled.

[Security scans](../.github/workflows/security.yml) and [dependency review](../.github/workflows/dependency-review.yml) run separately. [Dependabot auto-merge](../.github/workflows/dependabot-auto-merge.yml) covers patch/minor updates; major updates require manual review.

Follow the [Security policy](../SECURITY.md) for reports and [documentation privacy guidance](DEVELOPMENT.md#documentation-privacy) before sharing evidence.
