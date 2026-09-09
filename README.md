# Job Search Tracker

A lightweight application tracker for managing job prospects, monitoring status changes, and importing basic job details from a public posting URL.

This project is implemented with:
- Next.js app-router frontend
- React 19 + TypeScript
- Vite for local development/build tooling
- Cloudflare Worker runtime
- Cloudflare D1 database
- Drizzle ORM
- shadcn-style UI components

## What the app does

- Add, edit, and delete job applications
- Search and filter by company, position, and status
- Track totals for total applications, active roles, interviews, and offers
- Update application status in place
- Export recorded applications to CSV
- Autofill company and title from a public job URL using HTML metadata and JSON-LD job data
- Let the user enter details manually if a site blocks automated reading or provides no usable metadata

## Architecture

The codebase follows a simple full-stack pattern:

- `app/page.tsx` — main tracker UI, form handling, search/filter logic, CSV export, and status updates
- `app/api/applications/route.ts` — list/create applications
- `app/api/applications/[id]/route.ts` — update/delete a single application
- `app/api/job-preview/route.ts` — fetch and parse job posting pages
- `db/schema.ts` — D1 schema for the `applications` table
- `db/index.ts` — Drizzle DB access tied to the Cloudflare `DB` binding
- `lib/applications.ts` — validation helpers and error normalization
- `worker/index.ts` — Cloudflare Worker entry point
- `tests/` — runtime, parser, UI, and browser validation tests

## Prerequisites

- Node.js 22.13 or later
- npm
- Chrome installed for browser-based tests

## Local development

```sh
npm install
npm run dev
```

Open http://localhost:5173 to use the app.

### Useful commands

```sh
npm run db:migrate   # apply local D1 migrations explicitly
npm run db:generate  # generate SQL after editing db/schema.ts
npm run build        # production build
npm start            # preview the built Worker
npm run typecheck    # TypeScript validation
npm run lint         # ESLint checks
npm test            # build + runtime unit tests
npm run test:browser # Playwright browser checks
```

## Cloudflare D1 and hosting

The app expects a Cloudflare D1 binding named `DB`.

- Local development uses the active D1 binding during `npm run dev` and stores data under `.wrangler/state/v3/d1`
- `wrangler.local.json` is used for local migration and local binding setup
- Production deployment still requires a real Cloudflare binding and the corresponding migration setup
- The repository does not include a hosted binding configuration, so no live production deployment was changed

The app intentionally avoids hard-coding production database credentials or hosted deployment details into source control.

## Job preview / autofill behavior

The job preview endpoint in `app/api/job-preview/route.ts`:

- accepts an HTTP or HTTPS job URL
- follows limited redirects
- reads the HTML response
- looks for JSON-LD `JobPosting` data and metadata tags such as `og:title` and `og:site_name`
- falls back to parsing the page title and URL host when possible

If the site blocks access, requires login, times out, or returns no usable metadata, the UI shows an error and the user can enter the data manually. This is intentional because not every job board supports reliable automatic extraction.

## Authentication and Gmail notes

The repository includes helpers in `app/chatgpt-auth.ts` for identity headers that may be supplied by a hosting environment, but the current tracker does not use them for user-specific data isolation.

Important current behavior:
- the app is a shared workspace model
- there is no per-user authentication flow
- there is no Gmail sync or OAuth implementation

A real Gmail integration would need Google OAuth, Gmail API access, encrypted credential storage, per-user scoping, and explicit consent. Recruiter email import should be treated as a user-confirmed signal, not as automatic trust.

## Verification

The project includes checks for TypeScript, linting, runtime tests, and browser behavior:

```sh
npm run typecheck
npm run lint
npm test
npm run test:browser
```

The browser tests cover create/edit/delete flows, status changes, persistence after reload, CSV output, search, failed saves, and blocked-link handling. The runtime tests run the Worker in an isolated D1 environment, and parser tests validate the HTML extraction logic against controlled fixtures.

To run the optional live Greenhouse autofill check in PowerShell:

```powershell
$env:TEST_LIVE_AUTOFILL = '1'
npm run test:browser
```

This check depends on the external site being reachable and will clean up any temporary test records it creates.
