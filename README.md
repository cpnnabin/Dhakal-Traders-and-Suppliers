# Dhakal Traders & Suppliers — Website

## Setup & Run

### Quick Start (both client + server)
```
### Cloudflare Pages / Functions

This project uses Cloudflare Pages Functions and a D1 (SQLite) database. For authentication to work in the live Cloudflare deployment you must configure the following environment variables in the Cloudflare Pages dashboard (or via Wrangler when deploying):

- `POS_JWT_SECRET` — a long random string used to sign JWT tokens. DO NOT commit a production secret to source control. Use the Cloudflare dashboard Secrets UI.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — optional initial admin seed values (defaults are provided).

If you use `wrangler.toml` for deployment you can add them under the `[vars]` section (development placeholders are already added in the file):

```toml
[vars]
POS_JWT_SECRET = "REPLACE_WITH_STRONG_SECRET"
ADMIN_EMAIL = "admin@dhakaltraders.com"
ADMIN_PASSWORD = "dhakal@pos2026"
```

After setting up the env variables, deploy the Pages site or run `wrangler` to ensure Functions can access the D1 binding and `POS_JWT_SECRET`.

If you see server 500s or "Unexpected end of JSON input" in the browser console when calling `/api/auth`, check the Cloudflare Function logs — the function will now print errors to the Logs panel which helps identify issues such as missing bindings or runtime exceptions.

### Client only
```bash
cd client
npm install
npm run dev
# Opens at http://localhost:5173
```
cd server
cp .env.example .env
# API at http://localhost:5000
```
```bash
npm run build
# Output in client/dist/
```

## Deploy to Cloudflare Pages

### Recommended setup for the frontend
- **Project root:** `client`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

The client already includes a `public/_redirects` file so Cloudflare Pages will serve the SPA correctly on refresh and deep links.

### Contact API on Cloudflare (already migrated)
This repo now includes a Cloudflare Pages Function at `client/functions/api/contact.js`.
For CLI compatibility, it also includes `client/public/_worker.js` (copied to `dist/_worker.js` on build), so `wrangler pages deploy client/dist` includes API handling.

That means production `POST /api/contact` is handled directly by Pages (same domain), and writes to D1.

In your Cloudflare Pages project settings:
- Add a **D1 binding** named `DB`
- Select database: `dhakaltraders`
- Add an environment variable or secret: `ADMIN_PASSWORD` (used for `/response/` login)

### Generating and setting `POS_JWT_SECRET`

1. Generate a secure secret locally (recommended 48 bytes hex):

```bash
# from project root
node client/scripts/generate-secret.js
```

2. In Cloudflare Pages, open your site → Settings → Environment variables & secrets and add a secret named `POS_JWT_SECRET` with the generated value.

Alternatively, if you deploy with `wrangler` and want a quick dev placeholder, set it in `wrangler.toml` under `[vars]` (already contains a placeholder). Do NOT commit production secrets.

### Health check endpoint

There is a lightweight health endpoint available at `GET /api/health` which returns JSON indicating whether `POS_JWT_SECRET` is present and whether the D1 binding responds to a basic query. Use it to confirm Functions can access required bindings after deploy.

Local development behavior:
- `client` still proxies `/api/*` to Express (`http://localhost:5000`) via Vite
- production Pages uses the Functions handler for `/api/contact`

Deploy from CLI using:
- build: `npm run build`
- deploy: `wrangler pages deploy client/dist --project-name dhakaltradersandsuppliers`

Because `_worker.js` is included in `dist`, `/api/contact` is handled in production after deploy.

## API Endpoints
- `POST /api/contact` — submit contact form
- `GET  /api/contacts` — view submissions (requires header `x-admin-password`)
- `GET  /api/products` — list products
- `GET  /api/health`   — server health check

## Stack
- **Frontend**: React 18 + TypeScript + Vite 5
- **Backend**: Express + SQLite3
- **Styling**: Custom CSS (no framework)
- **Language**: Nepali / English toggle

## Contact Form Fields
- `name` (required)
- `email` (required)
- `phone`
- `subject`: `timur | herbs | daily | wholesale | inquiry`
- `message` (required)

## Admin Response Page
- Open: `/response/`
- Login using `ADMIN_PASSWORD`
- After login, submitted contact info (including email) is visible in a table
