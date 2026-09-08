# Job Search Tracker

A full stack job application tracker built with Next.js, React, TypeScript, Cloudflare Workers, D1, and Drizzle ORM.

## Features

* Paste a job posting URL to extract the company and position automatically
* Add, edit, delete, search, and filter applications
* Change application status immediately
* Track application, interview, and offer totals
* Export data as CSV for Google Sheets or LibreOffice
* Enter details manually when a job board blocks automatic extraction

## Local development

```bash
npm install
npm run dev
```

The hosted version uses Cloudflare D1. Generate schema migrations with `npm run db:generate`.

## Gmail synchronization

Automatic status updates require Google OAuth and the Gmail API. Every user must explicitly grant read access. A public launch also requires per user data isolation, encrypted OAuth tokens, a privacy policy, and potentially Google OAuth verification. Never commit OAuth secrets. Copy `.env.example` to `.env.local` only after creating a Google Cloud OAuth application.

Suggested matching rules should treat recruiter messages as signals rather than guaranteed decisions. Match sender domains and company names, detect phrases associated with applications, assessments, interviews, offers, and rejections, and always let users confirm or undo automated changes.
