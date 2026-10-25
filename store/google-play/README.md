# Google Play listing and artwork

Owns Android listing copy, exports, and design sources. Before uploading, compare imagery/notes with the installed release; retained artwork may be outdated.

## Listing files

| Asset | File | Format |
| --- | --- | --- |
| Feature graphic | [feature-graphic.png](graphics/feature-graphic.png) | 1024×500 PNG |
| App icon | [icon.png](graphics/icon.png) | 512×512 PNG, derived from the [runtime icon](../../assets/app/icon.png) |
| Home screenshot | [01-home.png](screenshots/01-home.png) | 1080×1920 RGB PNG |
| Calendar screenshot | [02-calendar.png](screenshots/02-calendar.png) | 1080×1920 RGB PNG |
| Insights screenshot | [03-insights.png](screenshots/03-insights.png) | 1080×1920 RGB PNG |
| Streaks/Frequency screenshot | [04-streaks.png](screenshots/04-streaks.png) | 1080×1920 RGB PNG |

Copy for Play Console:

- [English short description](listing/en-US/short-description.txt)
- [English full description](listing/en-US/full-description.txt)
- [Versioned release notes](releases/) retained for published and prepared bundles

Release-note languages vary by version and do not imply equivalent app localization. The app supports English and Spanish.

## Sources and reproduction

The [approved contact sheet](sources/approved-contact-sheet.png) holds four screenshot panels. [split-contact-sheet.cjs](tools/split-contact-sheet.cjs) uses `sharp` to split/fit exports without cropping; preserve original artwork.

The illustrated feature graphic’s [generation prompt](sources/feature-graphic-prompt.txt) supports future variants.

## Release submission

Use the [GitHub release sequence](../../docs/DEVELOPMENT.md#github-release-sequence) for version preparation, release-note inputs and limits, signed AAB builds, closed testing, and production promotion. Verify the listing and release notes against the selected bundle.

## Publication checks

Before publishing, check [Play image requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), current behavior, asset rights, synthetic data, and [documentation privacy](../../docs/DEVELOPMENT.md#documentation-privacy). Retain useful sources/final listings; exclude temporary captures/build artifacts.