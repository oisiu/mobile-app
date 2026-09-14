# Oisiu mobile app

Oisiu is a local-first habit tracker for Android and iOS, built with Expo and React Native. Habit data stays on the device unless the user explicitly exports it. The app requires no account, backend, telemetry, or network connection.

## Development

Use the Node.js and pnpm versions declared in [`package.json`](package.json):

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

Useful commands:

```bash
pnpm android
pnpm ios
pnpm build
pnpm verify
pnpm test
pnpm run doctor
pnpm run audit
```

See [Development](docs/DEVELOPMENT.md) for native setup and dependency guidance.

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and navigation |
| `src/` | Domain, data, features, localization, theme, and utilities |
| `tests/` | Automated tests |
| `assets/` | Images bundled with the app |
| `store/` | Marketplace listings, artwork, screenshots, and release notes |
| `docs/` | Product and engineering documentation |

Generated Expo state, native projects, build outputs, coverage, and credentials are ignored.

## Documentation

- [Product](docs/PRODUCT.md)
- [UI and UX](docs/UI_UX.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Google Play listing](store/google-play/README.md)

## Legal, support, and security

- [Privacy policy](https://oisiu.github.io/legal/privacy.html)
- [Terms of use](https://oisiu.github.io/legal/terms.html)
- [Support](https://oisiu.github.io/legal/support.html)
- [Security policy](SECURITY.md)

Contributions are welcome; see [Contributing](CONTRIBUTING.md). Source code is available under the [Apache License 2.0](LICENSE). The license does not grant rights to the Oisiu product identity; see [NOTICE](NOTICE).
