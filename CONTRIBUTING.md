# Contributing to Oisiu

## Before starting

For a substantial change, open an issue first so its behavior and scope can be agreed before implementation. Bug fixes and focused documentation corrections can go directly to a pull request.

Read the [development guide](docs/DEVELOPMENT.md) for setup and workflow and the [architecture](docs/ARCHITECTURE.md) for code boundaries. User-facing behavior belongs in [Product](docs/PRODUCT.md) or [UI and UX](docs/UI_UX.md), rather than being repeated here.

## Pull requests

- Keep changes focused and preserve the local-first, account-free design.
- Follow the [architecture boundaries](docs/ARCHITECTURE.md#runtime-boundaries).
- Add meaningful regression tests for changed behavior.
- Update the document that owns any changed fact.
- Complete the checks in [Testing](docs/TESTING.md#required-gates). Document any unperformed native checks or unresolved failures instead of hiding them.
- Follow the [documentation privacy guidance](docs/DEVELOPMENT.md#documentation-privacy).

## Licensing

By submitting a contribution, you agree that it is licensed under the repository's [Apache License 2.0](LICENSE), as described in section 5 of that license. The license does not grant rights to use the Oisiu product identity beyond describing the origin of the software.
