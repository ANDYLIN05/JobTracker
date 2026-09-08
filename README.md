# Job Search Tracker

A job application tracker built with React, TypeScript, Vinext/Vite, Cloudflare Workers, D1, and Drizzle ORM. The existing page layout, colors, and components are retained.

## Hosting

This repository targets **Cloudflare Workers and D1 through OpenAI Sites**. `worker/index.ts` is the Worker entry point; `vite.config.ts` configures the Cloudflare plugin; `build/sites-vite-plugin.ts` packages Sites metadata and SQL migrations into `dist/.openai`.

The exported repository does not include `.openai/hosting.json`. When that file is absent, Vite uses a local `DB` binding with a placeholder database ID. When Sites supplies the file, its binding configuration is used. `wrangler.local.json` is exclusively for local migration commands; its placeholder ID is not a production database. Production deployment still requires the hosting platform's real bindings and migration setup. No live deployment was changed.

## Local development

Requires Node.js 22.13 or later. Commands work in Windows PowerShell and Unix shells.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Startup applies the checked-in migrations to local D1 automatically. Data persists under `.wrangler/state/v3/d1`; it is separate from hosted data.

```sh
npm run db:migrate  # Apply local migrations explicitly
npm run db:generate # Generate SQL after editing db/schema.ts
npm run build
npm start           # Preview the built Cloudflare Worker at http://localhost:4173
```

`npm run install:ci` remains the original Linux Sites installation helper and requires its Unix utilities. Use `npm ci` for a clean Windows install.

## Features

- Add, edit, delete, search, and filter applications.
- Change application status and track application, interview, and offer totals.
- Export all applications as CSV, including quoted notes and dates.
- Autofill from public HTML job postings using JSON-LD, metadata, and Greenhouse page titles.
- Enter details manually when a site requires login, blocks reading, times out, or lacks usable metadata. Autofill cannot guarantee support for every job board.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run test:browser
```

Browser tests use installed Google Chrome in headless mode. They exercise CRUD, status changes, persistence after reload, CSV download contents, search, deletion cancellation, failed saves, and blocked-link errors. Runtime tests execute the production Worker in Miniflare with an isolated D1 database. Parser tests use controlled HTML fixtures. Component tests use separate Vite caches so they do not disrupt the running app.

To include the optional live Greenhouse autofill check in PowerShell:

```powershell
$env:TEST_LIVE_AUTOFILL = '1'
npm run test:browser
```

The live check depends on the external board being available. Tests remove the application records they create after successful runs.

## Authentication and Gmail

`app/chatgpt-auth.ts` contains helpers for Sites-injected identity headers, but the tracker does not currently call them or scope application rows by user. The current data model is a shared workspace.

Gmail synchronization is not implemented. It would require Google OAuth, the Gmail API, per-user data isolation, encrypted token storage, and user consent. Recruiter messages should be treated as signals that users can confirm or undo. Never commit OAuth secrets.
