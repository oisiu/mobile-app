# Development

## Environment and commands

Use the [root setup instructions](../README.md#start-development). The root [package.json](../package.json) owns the Node.js requirement and pnpm version; [CI](../.github/workflows/ci.yml) owns its runtime selection. Tests require Node's SQLite runtime. Use Java 21 for Android Gradle builds. Expo and React Native versions live in the [mobile manifest](../package.json).

The root manifest owns the application scripts:

| Command | Purpose |
| --- | --- |
| `pnpm start` | Start Expo |
| `pnpm android` / `pnpm ios` | Build and install the native debug app and start Metro; these do not generate release builds |
| `pnpm build` | Export production Android and iOS JavaScript bundles |
| `pnpm typecheck` / `pnpm lint` / `pnpm deadcode` | Run individual static checks |
| `pnpm test:coverage` | Run tests with domain coverage |

Use Android Studio/emulator for Android and Xcode on macOS for iOS. In Expo, `a` opens Android and `i` opens iOS. Fast Refresh handles ordinary source edits; use `pnpm start --clear` from the repository root if the Metro cache is stale. The `deadcode` script runs Knip. Web is unsupported and has no launch script.

## Generated Android files and assets

`app.json`, the package manifest, and the lockfile own native configuration. `android/` is an ignored Expo-generated project, retained locally for Android Studio and signing. When absent, `pnpm android` generates it before building. Avoid keeping durable configuration only in generated files; inspect local native changes and preserve signing material before regenerating.

Android `app/build/`, `app/.cxx/`, `build/`, `.gradle/`, and `.kotlin/` are disposable output/cache directories. Remove them only when builds are stopped; the next build recreates them and takes longer. Preserve release bundles and signing files until their release lifecycle is complete.

All three `assets/app/` images are runtime/build inputs used by Expo for the icon and light/dark splash. Store exports have different dimensions and purposes; maintain them separately according to the [listing guide](../store/google-play/README.md). Do not retain temporary captures or superseded design references.

## Android development connection recovery

Keep the `pnpm android` terminal running while using the debug app. Expo Go's “Something went wrong” with “Failed to download remote update” means it could not load the project; inspect its error log before treating this as an application crash. `pnpm android` opens the installed Oisiu debug app, while `pnpm start` can open Expo Go.

If the native app reports “Unable to load script”, confirm Metro is running at `http://localhost:8081/status`. If the emulator cannot reach its default `10.0.2.2:8081` address, run `adb reverse tcp:8081 tcp:8081`, open the React Native developer menu (`adb shell input keyevent 82`), choose **Change Bundle Location**, enter `localhost:8081`, and apply the change. The bundle location persists for that debug installation; repeat ADB forwarding after reconnecting if needed. This recovery does not require clearing application data. Release builds contain their JavaScript bundle and do not need Metro.

## Android release builds

For each new Google Play bundle, increment `expo.android.versionCode` in `app.json` above every previously uploaded code. Keep the generated `android/app/build.gradle` version code aligned before signing in Android Studio (or regenerate it with Expo prebuild). The visible app version is separate and does not replace this integer. Rebuild the signed AAB after changing the code; an existing bundle retains its original code.

## Dependencies

- From the repository root, add Expo-managed/native packages with `pnpm expo install <package>` and development packages with `pnpm add -D <package>`.
- Commit manifest and lockfile changes together. Check native alignment with `pnpm expo install --check`.
- Preserve pnpm's isolated layout. Add hoisting configuration only to resolve an observed dependency issue.
- Run the [required verification gates](TESTING.md#required-gates) before handoff, including after dependency changes.

[Dependabot configuration](../.github/dependabot.yml) owns update schedules, cooldowns, and dependency groups. Review Expo compatibility with Doctor and `expo install --check`; grouping does not establish SDK compatibility. Review updates before merging.

## Change workflow

Start with the public [contribution guide](../CONTRIBUTING.md). Automated agents also follow [AGENTS.md](../AGENTS.md). Then inspect the relevant code and subject document. Preserve unrelated working-tree changes. Add meaningful regression tests for changed behavior; follow the native checklist when UI or persistence changes.

Update the document that owns a changed fact. Replace superseded information instead of appending a task log, and link to configuration rather than copying version and threshold values. Handoffs must identify unresolved failures and unperformed checks.

## Documentation privacy

Use repository-relative links and synthetic examples. Keep credentials, signing keys/passwords, private URLs, personal paths, account identifiers, device serials, real exports, and unredacted logs or screenshots out of committed documentation. Review generated artifacts before sharing them. Report sensitive findings by location/category without copying their values.

A clean scan of current Markdown does not establish that Git history, ignored files, exports, or external services are free of sensitive information. Generated Expo/dependency/build files are not maintained documentation and should not be committed.
