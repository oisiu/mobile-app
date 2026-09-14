# Google Play listing and artwork

This directory owns Android listing copy, export files, and design sources. Compare all artwork and release notes with the installed release before uploading; retained exports are not evidence that they match a new build.

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
- [Version 1.0.0 release notes](releases/1.0.0.txt) in English, Spanish, French, Italian, European Portuguese, and German

Only release notes have all six translations. They do not imply equivalent app localization or production availability.

## Sources and reproduction

The [approved contact sheet](sources/approved-contact-sheet.png) contains the four screenshot panels. [split-contact-sheet.cjs](tools/split-contact-sheet.cjs) uses `sharp` to split and fit them into the export dimensions without cropping. Preserve the original artwork when reproducing these exports.

The feature graphic has illustrated phone screens; its [generation prompt](sources/feature-graphic-prompt.txt) is retained for future variants. The artwork does not establish that the current app matches the store imagery.

## Publication checks

Check the [Google Play image requirements](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en), current app behavior, asset rights, and synthetic data before publishing. Keep useful sources and final listing files in Git; exclude temporary captures and build artifacts. Follow the [documentation privacy guidance](../../docs/DEVELOPMENT.md#documentation-privacy).
