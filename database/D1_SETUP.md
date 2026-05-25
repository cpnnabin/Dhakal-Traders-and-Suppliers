# Cloudflare D1 Database — Dhakal Traders POS (optional)

> **Local development does not need this.** Use `cd server && npm run dev` for a local SQLite API.  
> This guide is only if you host the API on Cloudflare later.

POS data can be stored in **Cloudflare D1** (SQLite). The binding name in code is **`DB`** (see `wrangler.toml`).

| Setting | Value |
|---------|--------|
| Database name | `dhakaltraders` |
| Binding name | `DB` |
| Schema + seed file | `database/setup.sql` |

## 1. Create D1 in Cloudflare (first time)

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **D1**.
2. **Create database** → name: `dhakaltraders`.
3. Copy the **Database ID** and put it in `wrangler.toml` under `database_id` (if it differs from yours).

Or with Wrangler CLI:

```bash
npm install -g wrangler
wrangler login
wrangler d1 create dhakaltraders
```

## 2. Load tables and sample data

From the **project root** (requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed):

```bash
npx wrangler login
npx wrangler d1 execute dhakaltraders --remote --file=./database/setup.sql
```

This runs `database/setup.sql`, which creates:

- `login` — POS staff (owner, admin, cashier)
- `products` — product catalogue
- `customers` — customer records
- `sales` — invoices / orders
- `purchases` — stock purchases
- `contacts` — website contact form
- `admins` — response-page admin
- `transactions`, `accounts` — ledger (optional)

**Warning:** `setup.sql` drops existing tables first. Back up data before re-running on production.

## 3. Bind D1 (only if you host on Cloudflare)

In **Workers & Pages** → your project → **Settings** → **Functions** → D1 binding: `DB` → `dhakaltraders`.

Set `POS_JWT_SECRET` in environment variables (`node client/scripts/generate-secret.js`).

## 4. Verify

Test POS login at `#pos` with:

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@dhakaltraders.com | owner123 |
| Admin | admin@dhakaltraders.com | admin123 |
| Cashier | cashier@dhakaltraders.com | cashier123 |

## 5. API routes (Functions → D1)

| Endpoint | Table |
|----------|--------|
| `POST /api/auth` | `login`, `customers` |
| `GET/POST /api/products` | `products` |
| `GET/POST /api/sales` | `sales` |
| `GET/POST /api/purchases` | `purchases` |
| `GET/POST /api/customers` | `customers` |
| `GET/POST /api/users` | `login` |
| `POST /api/contact` | `contacts` |
| `GET /api/health` | D1 ping |

Functions live in `/functions/api/` at the repo root (not inside `client/`).

## 6. Useful Wrangler commands

```bash
# List tables
wrangler d1 execute dhakaltraders --remote --command "SELECT name FROM sqlite_master WHERE type='table'"

# Count products
wrangler d1 execute dhakaltraders --remote --command "SELECT COUNT(*) AS n FROM products"

# Open SQL console (remote)
wrangler d1 execute dhakaltraders --remote --command "SELECT email, role FROM login"
```

## 7. Local development

- **POS UI:** `cd client && npm run dev` — uses `/api/*` (Cloudflare-style paths when deployed; locally Vite proxies to Express on port 5001 if you run the server).
- **Full local DB mirror:** `cd server && npm run dev` — SQLite file `server/admin.sqlite`.
- **Local D1:** `wrangler pages dev client/dist` after `npm run build`, with `npm run db:setup:local`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `D1 database binding missing` | Add `DB` binding in Pages → Settings → Functions |
| `POS_JWT_SECRET not set` | Add secret in Pages environment variables |
| Login works offline but not online | Run `npm run db:setup:remote` and check `/api/health` |
| Empty products in POS | Seed D1; confirm `GET /api/products` returns JSON |
| 404 on `/api/products` | Deploy from repo root so `/functions` is included; rebuild client |
