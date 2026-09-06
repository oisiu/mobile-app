# oisiu

oisiu is a local-first habit tracker for Android and iOS, built with Expo and React Native. Records stay on the device unless the user exports them; no account or backend is required.

The project is early-stage and not yet release-ready. Current verification and remaining native checks are tracked in [Status](docs/STATUS.md).

## Start development

Install Node.js 20 or newer, then run from the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

See [Development](docs/DEVELOPMENT.md) for platform commands and dependency management. Web is not a supported V1 target.

## Contributing and security

Contributions are welcome; start with [Contributing](CONTRIBUTING.md). Report suspected vulnerabilities privately as described in the [Security policy](SECURITY.md), not through a public issue.

Oisiu's handling of local records, exports, retention, and deletion is described in the [Privacy policy](PRIVACY.md).

## License

The source is available under the [Apache License 2.0](LICENSE). The license does not grant permission to use the Oisiu product identity except to describe the software's origin; see [NOTICE](NOTICE).

## Documentation

| Document | Owns |
| --- | --- |
| [Agent guide](AGENTS.md) | Contribution rules and definition of done |
| [Contributing](CONTRIBUTING.md) | Human contribution and pull-request entry point |
| [Security](SECURITY.md) | Private vulnerability-reporting process |
| [Privacy](PRIVACY.md) | User-data handling, retention, deletion, and privacy contact |
| [Development](docs/DEVELOPMENT.md) | Environment, dependencies, workflow, and documentation privacy |
| [Status](docs/STATUS.md) | Current verification, limitations, and next work |
| [Product](docs/PRODUCT.md) | V1 capabilities, rules, and exclusions |
| [UI and UX](docs/UI_UX.md) | Screen interactions, presentation, and accessibility |
| [Architecture](docs/ARCHITECTURE.md) | Repository layout and code boundaries |
| [Database](docs/DATABASE.md) | Schema, migrations, integrity, and transfer formats |
| [Testing](docs/TESTING.md) | Required checks and native verification checklist |
| [Decisions](docs/DECISIONS.md) | Reasons behind durable choices |

Update the document that owns a changed fact; link to it elsewhere instead of copying its detail.
