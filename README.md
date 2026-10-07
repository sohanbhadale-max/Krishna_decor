# Krishna Decor

Krishna Decor has two separate role-specific web apps backed by one secured API:

- `manager-app` — projects, quotations, invoices, payments, staff accounts, and staff activity.
- `staff-app` — project selection, field-measurement cart, cart editing, and cart saving.
- `api` — local development API plus a Render web service backed by Postgres for production.

Staff and manager functionality are separate, but the production database is intentionally shared: saving a staff cart updates the manager dashboard and makes its measurements available when the manager creates a quotation.

## Local development

Use three terminals.

    cd E:\PROJECTS\d-decor\api
    npm run start

    cd E:\PROJECTS\d-decor\manager-app
    npm install
    npm run dev

    cd E:\PROJECTS\d-decor\staff-app
    npm install
    npm run dev -- --port 5174

The manager app runs at `http://localhost:5173`, the staff app at `http://localhost:5174`, and the local API at `http://127.0.0.1:8788`.

The local API stores development data in `api/data/krishna-decor.json`. This file is intentionally ignored by Git and is not used in production.

## Cloud production deployment

Follow [RENDER_NEON_DEPLOY.md](RENDER_NEON_DEPLOY.md) to deploy the API to Render with a shared Postgres-backed database.

Before building the frontends for production, set `VITE_API_URL` to the deployed API URL, for example `https://api.your-domain.com/api`.

## Security and access

Passwords use salted Node `scrypt` hashes. Production login sessions are persisted in Postgres and expire after 12 hours. The API enforces manager-only project, quotation, payment, and staff-account operations; the staff API only permits field cart saves. Staff activity is recorded with the staff user name and timestamp.
