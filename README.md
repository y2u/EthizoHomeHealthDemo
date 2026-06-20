# Ethizo Home Health Care

Ethizo Home Health Care is a responsive home health operations platform built for US home health workflows. It includes a `React + Vite` frontend and a `CakePHP + MySQL` backend, with support for intake, episode management, SOC/OASIS, clinician documentation, EVV, QA, billing, and administration.

## Stack

- Frontend: `React`, `TypeScript`, `Vite`
- Backend: `CakePHP 5`, `PHP 8.4+`
- Database: `MySQL` for app data, `SQLite` supported for test runs

## Current Product Coverage

### Release 1
- patient registration and demographics
- referral intake and intake-document workflows
- episode creation and admission readiness
- SOC/OASIS completion with `OASIS-E2` date-aware handling
- clinician scheduling, documentation, and field actions
- QA work queue, documentation lock, and lifecycle workflows

### Release 2
- EVV operations and exception handling
- claim lifecycle updates
- denial and rework flow
- unified billing follow-up workflows

### Release 3
- admin settings and access policy controls
- user/session administration
- reporting and export workspace
- audit and compliance views

### Recent UX Work
- cleaner shell and dashboard layout
- modal-based patient, referral, and episode heavy forms
- collapsible left navigation
- improved workspace headers and list hierarchy
- SOC/OASIS speech capture with browser dictation and structured field extraction

## Repository Layout

- [frontend](frontend): React/Vite client
- [backend](backend): CakePHP API and workflow engine
- [Release1_Test_Script.md](Release1_Test_Script.md): Release 1 validation flow
- [System_Test_Script.md](System_Test_Script.md): current end-to-end system test script
- [Release_Checklist.md](Release_Checklist.md): release readiness checklist

## Local Setup

### Backend
From [backend](backend):

```bash
composer install
cp config/app_local.example.php config/app_local.php
bin/cake migrations migrate
bin/cake server -p 8765
```

Update `config/app_local.php` with your local MySQL connection details.

### Frontend
From [frontend](frontend):

```bash
npm install
npm run dev
```

The frontend uses the local Vite proxy for `/api` during development.

## Verification

### Backend
From [backend](backend):

```bash
composer test
```

### Frontend
From [frontend](frontend):

```bash
npm run lint
npm run build
```

## Primary Workflows to Validate

1. Create a patient
2. Capture a referral
3. Convert referral to episode
4. Complete SOC/OASIS
5. Test speech-assisted SOC/OASIS fill
6. Schedule and complete visits
7. Lock documentation through QA
8. Clear EVV and billing blockers
9. Run lifecycle actions
10. Validate admin, reporting, and audit areas

Use [System_Test_Script.md](System_Test_Script.md) for the full script.

## CI

A root GitHub Actions workflow is included to run:
- backend tests
- frontend lint
- frontend production build

See [.github/workflows/ci.yml](.github/workflows/ci.yml).

## Notes

- `backend/config/app_local.php` is intentionally ignored and should stay local.
- build artifacts, `node_modules`, logs, temp files, and vendor files are ignored at the repo root.
- browser speech recognition support for SOC/OASIS depends on the user’s browser; manual paste-and-apply is also supported.
