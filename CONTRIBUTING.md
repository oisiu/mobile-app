# Contributing to Oisiu

Thanks for helping improve Oisiu.

## Before starting

For a substantial change, open an issue first so its behavior and scope can be agreed before implementation. Bug fixes and focused documentation corrections can go directly to a pull request.

Read the [development guide](docs/DEVELOPMENT.md) for setup and workflow, the [architecture](docs/ARCHITECTURE.md) for code boundaries, and the [current status](docs/STATUS.md) for known gaps. User-facing behavior belongs in [Product](docs/PRODUCT.md) or [UI and UX](docs/UI_UX.md), rather than being repeated in this file.

## Pull requests

- Keep changes focused and preserve the local-first, account-free design.
- Put pure rules in `apps/mobile/src/domain/`, persistence in `apps/mobile/src/data/`, and UI coordination in `apps/mobile/src/features/`. Expo Router files should remain screens and navigation entry points.
- Add meaningful regression tests for changed behavior.
- Update the document that owns any changed fact and record current verification in `docs/STATUS.md`.
- Complete the checks in [Testing](docs/TESTING.md#required-gates). Document any unperformed native checks or unresolved failures instead of hiding them.
- Never commit credentials, signing material, real user exports, personal paths, or unredacted logs.

## Licensing

By submitting a contribution, you agree that it is licensed under the repository's [Apache License 2.0](LICENSE), as described in section 5 of that license. The license does not grant rights to use the Oisiu product identity beyond describing the origin of the software.
