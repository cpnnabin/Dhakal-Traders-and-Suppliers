Cloudflare D1 migration notes

This folder contains SQL migrations you can apply to a Cloudflare D1 database.

Quick steps (using Wrangler CLI):

1) Install Wrangler (if not already):

   npm install -g wrangler

2) Authenticate (one of):

   wrangler login

   or set environment variables:

   - CF_API_TOKEN (API token with D1 edit permissions)
   - CF_ACCOUNT_ID

3) Create a D1 database (if not created in the dashboard):

   wrangler d1 create <DB_NAME> --account-id $CF_ACCOUNT_ID

4) Execute the SQL migration file against the D1 database:

   wrangler d1 execute --account-id $CF_ACCOUNT_ID --database <DB_NAME> --file d1_migrations/001_setup.sql

Notes:
- Wrangler's flags/commands may vary with versions; consult Cloudflare docs if a command fails.
- Running the SQL will recreate the schema/tables and insert seed data included in the SQL.
- Make sure to backup any existing data in the D1 database before applying this migration.

Fallback: If you prefer, I can prepare a script that uses the Cloudflare REST API — you'll need to provide an API token and account id to run it here.
