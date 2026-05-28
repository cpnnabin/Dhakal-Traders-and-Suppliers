# Dhakal Traders MERN

A full-stack business management app for Dhakal Traders with:

- **Frontend**: React + Vite + TypeScript in `client/`
- **Backend**: Express + Node.js in `server/`
- **Cloudflare Pages Functions**: API routes in `functions/api/`
- **Database**: SQL migrations and local/remote DB tooling in `database/` and `server/migrations/`

## Project structure

- `client/` — frontend UI, pages, components, styles, and client-side routing
- `server/` — Express backend, models, migrations, utilities, and scripts
- `functions/api/` — Cloudflare Pages Functions endpoints
- `database/` — setup SQL, migration helpers, and database utilities
- `cloudflare/` — D1 migration notes and Cloudflare setup docs
- `functions/` — shared Cloudflare function files used for deployment

## Setup

Install dependencies from the root, then for the client and server as needed:

1. Root packages
2. `client/` packages
3. `server/` packages

Typical setup:

- `npm install`
- `cd client && npm install`
- `cd server && npm install`

## Common scripts

From the repository root:

- `npm run dev` — run client and server together
- `npm run dev:client` — start the Vite frontend
- `npm run dev:server` — start the backend server
- `npm run build` — build the frontend
- `npm run start` — start the backend server
- `npm run deploy` — build and deploy the client to Cloudflare Pages
- `npm run db:setup:remote` — apply the remote D1 setup SQL

## Frontend vs backend rule

- **Frontend (`client/src/`)**: UI only — forms, pages, buttons, state, and API calls
- **Backend (`server/` or `functions/api/`)**: API logic, database access, authentication, secrets, and business rules
- If a feature is needed on both sides, split it cleanly instead of duplicating the full logic

## Environment variables

The project uses a root `.env` file for local development. Keep secrets out of source control.

Typical variables may include:

- `POS_JWT_SECRET`
- database connection settings
- email / storage / upload credentials

## Cloudflare deployment

- `wrangler.toml` configures Cloudflare Pages + D1
- Frontend build output is `client/dist`
- Cloudflare function routes are served from `functions/api/`

## Notes

- `node_modules/` is intentionally ignored and should not be committed
- Local DB files such as `*.db` and `*.sqlite*` are ignored
- Build output in `client/dist/` is ignored because it is generated

## Related docs

- `cloudflare/README.md` — D1 migration notes
- `client/design/POS_DESIGN_SPEC.md` — POS UI design tokens and guidance

