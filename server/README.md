# Dhakal Traders Backend (Cloudflare D1/SQLite)

## Setup

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Start the server:
   ```bash
   npm run dev
   ```
   or
   ```bash
   npm start
   ```

3. The backend uses SQLite locally (file: `dhakaltraders.db`). For production, configure Cloudflare D1 as per Wrangler docs.

## API Endpoints

- `POST /api/contact` — Save contact form data
  - Body: `{ name, phone, subject, message }`
  - `subject` must be one of: `timur`, `herbs`, `daily`, `wholesale`, `inquiry`
- `GET /api/products` — List products
- `GET /api/services` — List services

## Notes
- CORS is enabled for local development.
- No MongoDB required. Uses SQLite/D1 for contact form storage.
- The contacts table is auto-created if it doesn't exist.
