# Development

## Environment and commands

Use the [root setup instructions](../README.md#development). The root [package.json](../package.json) owns the Node.js requirement and pnpm version; [CI](../.github/workflows/ci.yml) owns its runtime selection. Tests require Node's SQLite runtime. Use Java 21 for Android Gradle builds, including Android Studio sync. After regenerating Android, check the Gradle JDK or daemon JVM criteria in Android Studio; do not let it select the bundled Java 25 runtime. Java 25 native-access warnings can fail the Prefab configuration step in this SDK. If `android/gradle/gradle-daemon-jvm.properties` exists, its `toolchainVersion` must be `21`. Expo and React Native versions live in the [mobile manifest](../package.json).

The [package manifest](../package.json) defines all scripts:

| Command | Purpose |
| --- | --- |
| `pnpm start` | Start Expo |
| `pnpm android` / `pnpm ios` | Build and install the native debug app and start Metro; these do not generate release builds |
| `pnpm build` | Export production Android and iOS JavaScript bundles |
| `pnpm typecheck` / `pnpm lint` / `pnpm deadcode` | Run individual static checks |
| `pnpm test:coverage` | Run tests with enforced coverage |

Use Android Studio/emulator for Android and Xcode on macOS for iOS. In Expo, `a` opens Android and `i` opens iOS. Fast Refresh handles ordinary source edits; use `pnpm start --clear` from the repository root if the Metro cache is stale. The `deadcode` script runs Knip. Web is unsupported and has no launch script.

## Generated Android files and assets

`app.json`, the package manifest, and the lockfile own native configuration. `android/` is an ignored Expo-generated project, retained locally for Android Studio and signing. When absent, `pnpm android` generates it before building. Avoid keeping durable configuration only in generated files; inspect local native changes and preserve signing material before regenerating.

After an Expo SDK version change (upgrade or downgrade), regenerate Android with `pnpm expo prebuild --platform android --no-install` after preserving local native configuration and signing material. Old application templates can reference APIs removed by the new SDK even when JavaScript exports and Expo Doctor pass.

Android `app/build/`, `app/.cxx/`, `build/`, `.gradle/`, and `.kotlin/` are disposable output/cache directories. Remove them only when builds are stopped; the next build recreates them and takes longer. Preserve release bundles and signing files until their release lifecycle is complete.

`assets/app/icon.png` is the launcher icon. `assets/app/logo.png` is the approved cream-background balance illustration with “Powered by PalFly”; both themes use this same image, with rounded corners in the app's loading view. Expo also uses it for the native splash. Rebuild the native app after changing these assets; Fast Refresh cannot update an installed launcher icon or native splash. Store exports have different dimensions and purposes; maintain them separately according to the [listing guide](../store/google-play/README.md). Do not retain temporary captures or superseded design references.

## Android connection troubleshooting

Keep Metro running while using a debug build. If the app cannot load JavaScript:

1. Check Metro at `http://localhost:8081/status`.
2. Run `adb reverse tcp:8081 tcp:8081` for a connected Android device.
3. If needed, set **Change Bundle Location** in the developer menu to `localhost:8081`.

Repeat port forwarding after reconnecting. Release builds include their JavaScript bundle and do not need Metro.

## Android release builds

For each new Google Play bundle, increment `expo.android.versionCode` in `app.json` above every previously uploaded code. The visible app version is separate and does not replace this integer. Before first using the release workflows, ensure the committed version code is at least the highest code already uploaded to Play; preparation increments it by one.

### Manual GitHub release sequence

Run each workflow manually from **Actions → Run workflow** on `main`, in this order:

1. **Prepare release:** choose `patch`, `minor`, or `major`. Use the summary's compare link to create a PR into `main`. Complete English/Spanish release notes, pass CI, and merge. If CI does not start, run it manually on the release branch.
2. **Build Android release:** the prepared version on `main` is selected automatically. The workflow checks, builds, signs, and saves the AAB in a draft GitHub Release.
3. **Release to closed testing:** submit the saved AAB for that version to the configured track. Install and test that version.
4. **Publish to production:** confirm testing of the current version on `main`. This promotes the tested version as a full rollout without rebuilding.

No version input is needed. Each stage uses the prepared version on its selected `main` commit and fails if its prerequisites are missing; it never falls back to an older release. Finish the release before merging another version bump. Stages cannot be skipped. Wait for each run to finish, and keep its draft release, tag, and assets unchanged. Successful builds cannot be overwritten; inspect incomplete output after a failed build before retrying, or prepare a new version. A newer closed-testing release prevents promotion of the previous version. Check Play Console for review and publishing status after submission.

### GitHub and Play configuration

Create these environments under **Repository Settings → Environments** and add the listed **environment secrets**. Secret names are configuration; their values must never be committed.

| Environment | Secrets |
| --- | --- |
| `google-play-build` | `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` |
| `google-play-testing` | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` |
| `google-play-production` | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` |

- Restrict every environment to **Selected branches and tags → branch `main`**. Add production reviewers if available. Remove repository-level copies of these secrets after migration.
- Set the repository Actions variable `CLOSED_TESTING_TRACK` to the closed track API identifier, usually `alpha`.
- Keep default token permissions read-only. **Allow GitHub Actions to create and approve pull requests** can stay disabled; PR creation is manual.
- Enable the Google Play Android Developer API, create a service account, and invite it in Play Console **Users and permissions** with app-scoped read, testing release, and production release access. Configure the track, testers, listing, and policy declarations before submitting.
- Back up credentials outside Git and rotate them if exposed.

Implementation: [release script](../scripts/release/android.cjs).

For local Android Studio signing, keep the generated `android/app/build.gradle` version code aligned with `app.json` (or regenerate with Expo prebuild). Rebuild the signed AAB after changing the code; an existing bundle retains its original code.

## Dependencies

Keep Expo and its managed dependencies on compatible stable releases, using the versions in the manifest and lockfile. Coordinate SDK changes with the native dependency overrides in `pnpm-workspace.yaml`, and keep React test renderer aligned with React. Preview SDKs and React Native release candidates require an explicit decision to adopt prereleases. Follow the native regeneration guidance above and the [native testing checklist](TESTING.md#native-checklist); successful JavaScript bundle exports do not establish native compatibility.

- From the repository root, add Expo-managed/native packages with `pnpm expo install <package>` and development packages with `pnpm add -D <package>`.
- Commit manifest and lockfile changes together. Check native alignment with `pnpm expo install --check`.
- Run `pnpm deps:check` to verify installed React/test renderer and Vitest/coverage versions match exactly. This also runs as part of `pnpm verify`; upgrade each pair together.
- Preserve pnpm's isolated layout. Add hoisting configuration only to resolve an observed dependency issue.
- Run the [required verification gates](TESTING.md#required-gates) before handoff, including after dependency changes.

[Dependabot configuration](../.github/dependabot.yml) owns update schedules, cooldowns, and dependency groups. Review Expo compatibility with Doctor and `expo install --check`; grouping does not establish SDK compatibility. Review updates before merging.

## Change workflow

Start with the public [contribution guide](../CONTRIBUTING.md). Automated agents also follow [AGENTS.md](../AGENTS.md). Then inspect the relevant code and subject document. Preserve unrelated working-tree changes. Add meaningful regression tests for changed behavior; follow the native checklist when UI or persistence changes.

Update the document that owns a changed fact. Replace superseded information instead of appending a task log, and link to configuration rather than copying version and threshold values. Handoffs must identify unresolved failures and unperformed checks.

## Documentation privacy

Use repository-relative links and synthetic examples. Never commit credentials, personal paths, private account details, real user exports, or unredacted logs/screenshots. Review artifacts before sharing; a Markdown review does not cover Git history or ignored files.
