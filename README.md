# Hugo Entitlement Importer Desktop

Languages: English | [简体中文](README.zh-CN.md)

Desktop tool for bulk-importing SaaS entitlement assignments. Upload a CSV, validate rows, preview the impact on seat counts, commit the import, and export the result package. Built with Electron + Vue 3.

## Screenshots

Upload a CSV, fix validation issues, then review impact before committing:

| Upload & Validate | Impact Preview | Progress |
| --- | --- | --- |
| ![Import home](docs/images/import_home.png) | ![Import impact](docs/images/import_impact.png) | ![Import progress](docs/images/import_progress.png)

| Results | History |
| --- | --- |
| ![Import results](docs/images/import_results.png) | ![History home](docs/images/history_home.png) |

## Dependencies

This app is a frontend client and requires two related projects running locally:

- **Backend**: [HugoHZXu/hugo-saas-backend](https://github.com/HugoHZXu/hugo-saas-backend) — provides entitlement, identity, and import APIs
- **UI components**: [HugoHZXu/hugo-ui](https://github.com/HugoHZXu/hugo-ui) — `@hugo-ui/shadcn-vue` package, linked locally via the `.npmrc` registry config

## Tech Stack

Electron, Vue 3, TypeScript, Vite (with electron-vite), Pinia, vue-i18n, AntV G2, Vitest, pnpm workspace.

## Documentation

- [Packaging guide](docs/packaging.md) ([简体中文](docs/packaging.zh-CN.md))

## Local Development

Prerequisites:

- Node.js `>=22.13.0`
- pnpm `>=11.9.0 <12`
- Local build of `@hugo-ui/shadcn-vue` from [HugoHZXu/hugo-ui](https://github.com/HugoHZXu/hugo-ui)
- Backend services from [HugoHZXu/hugo-saas-backend](https://github.com/HugoHZXu/hugo-saas-backend) running locally

Backend service URLs can be overridden via environment variables:

| Service | Default URL | Env var |
| --- | --- | --- |
| Entitlement REST API | `http://127.0.0.1:4317` | `VITE_ENTITLEMENT_REST_URL` or `VITE_BACKEND_URL` |
| Entitlement GraphQL API | `http://127.0.0.1:4317/graphql` | `VITE_ENTITLEMENT_GRAPHQL_URL` |
| Identity service | `http://127.0.0.1:4320` | `VITE_IDENTITY_SERVICE_URL` |

Install dependencies and start development:

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the Vite dev server and launches Electron. Other useful commands:

```bash
pnpm test      # run Vitest
pnpm build     # typecheck and build all packages
```

## Import Workflow

1. Sign in with an identity account and select an entitlement organization
2. The app loads products and entitlements available for that org
3. Upload a CSV — the app parses it locally
4. **Local validation** catches obvious issues immediately: missing email, invalid email format, unrecognized action, duplicate emails, conflicting actions on the same email
5. A backend import job is created and server-side validation runs, checking for:
   - Unregistered email addresses (not in the SaaS identity system)
   - Registered users who are not members of the selected organization
   - Entitlement state (e.g., inactive entitlements, existing allocations for `revoke`)
   - Seat limit impact
6. Review the merged results in the table — you can edit rows, remove problematic rows, or skip warnings
7. A separate chart window shows seat occupancy impact before you commit
8. Commit the job — the app polls until processing finishes
9. Export a result package (.zip) containing an XLSX summary report and success/failure CSVs

### Roles and User Handling

How the importer handles users depends on your role in the organization:

- **Organization managers** (members with organization membership management permission):
  - **Unregistered users**: will be created in the identity system with `Incomplete` status, added to the organization, and allocated seats upon confirmation
  - **Registered users outside the org**: will be added to the organization and allocated seats upon confirmation

- **Entitlement managers only** (members who can assign entitlements but cannot manage organization membership):
  - **Unregistered users**: cannot be imported — they are not in the identity system and you lack permission to create accounts
  - **Registered users outside the org**: cannot be imported — you lack permission to add them to the organization

Rows that cannot be imported due to missing permissions will be marked as blocked and must be removed or skipped before commit.

## CSV Format

| Column | Required | Description |
| --- | --- | --- |
| `email` | Yes | Trimmed and lowercased for duplicate detection |
| `name` | No | Trimmed and passed through to the backend |
| `department` | No | Trimmed and passed through to the backend |
| `action` | No | `assign` (default if empty) or `revoke` |

Sample CSV files are in `test-data/`.

## Architecture Notes

- The app uses a pnpm monorepo with three packages: `web/` (Vue renderer), `electron/` (main + preload), `charts/` (shared G2 chart components)
- The impact chart opens in a separate Electron window. Chart data is sent via IPC; after loading, the chart window re-requests the latest payload so state stays in sync on refresh/reopen
- In dev mode Electron loads the Vite dev server URL; in production it loads the built files from `web/dist`

## License

MIT
