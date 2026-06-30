# Hugo Entitlement Importer Desktop

[中文说明](docs/README.zh-CN.md)

Hugo Entitlement Importer Desktop is a portfolio Electron application for a SaaS entitlement administration workflow. It focuses on bulk entitlement import review: CSV upload, validation feedback, impact analysis, import progress, result review, history lookup, and chart-based summaries.

This repository is intended to demonstrate product engineering, frontend architecture, desktop integration, and UI implementation. It is not packaged as a plug-and-play commercial product.

## Screenshots

| Import | Validation | Progress |
| --- | --- | --- |
| ![Import home](docs/images/import_home.png) | ![Import validation](docs/images/import_validation.png) | ![Import progress](docs/images/import_progress.png) |

| Impact | Results | History |
| --- | --- | --- |
| ![Import impact](docs/images/import_impact.png) | ![Import results](docs/images/import_results.png) | ![History home](docs/images/history_home.png) |

## What This Project Shows

- Electron desktop shell with a Vue renderer.
- Bulk CSV import workflow with validation, review, commit, result, and history states.
- Product and entitlement data modeling for a SaaS admin domain.
- Chart dashboards built around import review and seat occupancy signals.
- English and Chinese UI copy with `vue-i18n`.
- Typed API client, Pinia stores, and focused Vitest coverage for core importer logic.

## Related Repositories

- Backend: [HugoHZXu/hugo-saas-backend](https://github.com/HugoHZXu/hugo-saas-backend)
- UI package: [HugoHZXu/hugo-ui](https://github.com/HugoHZXu/hugo-ui)

The app expects the backend services from `hugo-saas-backend` for entitlement, identity, and import APIs.

The UI components come from `@hugo-ui/shadcn-vue`, which is maintained in `hugo-ui`. This repository keeps that package as a local npm dependency through the local registry configured in `.npmrc`, so a fresh clone is not expected to install without the local UI package setup.

## Tech Stack

- Electron
- Vue 3
- TypeScript
- Vite and electron-vite
- Pinia
- vue-i18n
- AntV G2
- Vitest
- pnpm workspace

## Local Backend Assumptions

By default, the desktop app talks to local backend services:

| Service | Default URL | Override |
| --- | --- | --- |
| Entitlement REST API | `http://127.0.0.1:4317` | `VITE_ENTITLEMENT_REST_URL` or `VITE_BACKEND_URL` |
| Entitlement GraphQL API | `http://127.0.0.1:4317/graphql` | `VITE_ENTITLEMENT_GRAPHQL_URL` |
| Identity service | `http://127.0.0.1:4320` | `VITE_IDENTITY_SERVICE_URL` |

See [HugoHZXu/hugo-saas-backend](https://github.com/HugoHZXu/hugo-saas-backend) for the backend side of the portfolio system.

## Local Development Notes

Prerequisites:

- Node.js `>=22.13.0`
- pnpm `>=11.9.0 <12`
- Local availability of `@hugo-ui/shadcn-vue` from [HugoHZXu/hugo-ui](https://github.com/HugoHZXu/hugo-ui)
- Local backend services from [HugoHZXu/hugo-saas-backend](https://github.com/HugoHZXu/hugo-saas-backend)

Common scripts:

```bash
pnpm test
pnpm build
pnpm dev
```

`pnpm build` runs type checking, builds the chart package, builds the web renderer, and builds the Electron main/preload output. This repository does not include CI, installer packaging, or GitHub Release automation because the project is published as a portfolio codebase rather than a distributed desktop product.

## Project Structure

```text
packages/
  charts/     Shared chart components and chart data types.
  electron/   Electron main and preload processes.
  web/        Vue renderer application.
docs/images/  Portfolio screenshots used by this README.
test-data/    Sample CSV files for import scenarios.
```

## License

MIT
