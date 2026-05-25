Production deployment checklist

Overview
--------
This document lists recommended steps and required environment variables to securely run the Dhakal Traders backend in production.

Required environment variables
------------------------------
- JWT_SECRET: A high-entropy secret used to sign JWT tokens. MUST be set in production. Example: a >=32 character random string.
- FRONTEND_URL: Comma-separated allowed origins for CORS (e.g. https://pos.dhakaltraders.com,https://app.dhakaltraders.com)
- PORT: Optional. Default 5001.
- NODE_ENV: Set to "production" to enable production hardening.

Security & deployment recommendations
------------------------------------
1. Use HTTPS in front of the Node process (reverse proxy):
   - Deploy behind Nginx/Caddy/Traefik or a cloud load-balancer that terminates TLS.
   - Ensure the proxy sets `X-Forwarded-Proto: https` so the server can detect secure requests.

2. JWT secret:
   - Generate a strong secret (use a password manager or `openssl rand -base64 48`).
   - Set `JWT_SECRET` in your environment (do NOT store in repo).

3. CORS:
   - Set `FRONTEND_URL` to the exact origins that must be allowed.
   - Do not use `*` in production.

4. Process manager & restarts:
   - Run the server under a process manager like `systemd`, `pm2`, or Docker with restart policies.

5. Database backups and monitoring:
   - If using SQLite, ensure regular file backups.
   - For Cloudflare D1, use Cloudflare recommended backup/exports.

6. Logging & monitoring:
   - Forward logs to a centralized log collector (Papertrail, Datadog, etc.).
   - Monitor error rates and socket connection counts.

7. Socket.IO and security:
   - The server will accept JWT tokens on socket handshake (handshake.auth.token) and auto-join role rooms.
   - Only authenticated sockets are allowed to join role rooms; owner/admin sockets may join more rooms.
   - In production ensure JWT_SECRET is set and tokens are issued only by trusted login endpoints.

8. Rate limiting & brute-force protection:
   - Consider adding rate limiting on the login endpoint to prevent credential stuffing.

Quick start (example)
---------------------
1. Install dependencies and build (on server):

```bash
cd server
npm ci
NODE_ENV=production JWT_SECRET="$(openssl rand -base64 48)" FRONTEND_URL="https://pos.example.com" PORT=5001 npm start
```

2. Recommended: run behind Nginx or Caddy and let them handle TLS. Example systemd unit or Docker container recommended.

Notes
-----
- This project ships with permissive defaults for local development. When you set `NODE_ENV=production` the server will:
  - require `JWT_SECRET` and `FRONTEND_URL` to be set
  - redirect HTTP traffic to HTTPS
  - trust the proxy headers (set `app.set('trust proxy', 1)`)

Contact
-------
If you need help packaging a production container image or systemd unit, tell me your target environment (Ubuntu systemd, Docker Compose, or cloud provider) and I can scaffold it.
