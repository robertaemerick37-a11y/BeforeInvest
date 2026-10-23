# Vercel and Turso deployment

The server uses Turso/libSQL for persistent account and transaction data. Do
not use a local `users.db` file as the production database on Vercel.
The website pages, stylesheets, browser scripts, and media assets live in
`public/`, where Vercel serves them as static assets. Express `express.static()`
is only used as a local-development fallback; Vercel does not serve static
assets from that middleware.

## Configure the database

1. Create a Turso database and a database authentication token.
2. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in the local `.env` file and
   in Vercel's Environment Variables. Keep separate Turso databases for local
   development and production.
3. Configure the other required application variables in Vercel, including
   `JWT_SECRET`, `PROFILE_ENCRYPTION_KEY`, `PUBLIC_ORIGIN`, and the SMTP
   settings used for admin sign-in and password-reset email.
4. Deploy. The app creates or updates its tables the first time a database-backed
   API route is called.

`server.js` exports the Express app for Vercel and only opens a local HTTP
listener when run directly with `npm start`.

## Import existing local data

The local `users.db` is not uploaded or modified by deployment. To copy its
users, password-reset tokens, transactions, and account ledger to Turso:

1. Initialize the schema in a fresh Turso database by deploying the app and
   making a database-backed API request. Do not accept registrations or writes
   to that database before importing.
2. Export the existing local records with Python's built-in SQLite support:

   ```powershell
   $migrationFile = Join-Path $env:TEMP "users-turso-import.sql"
   python scripts\export-sqlite-to-turso.py users.db $migrationFile
   ```

3. Import the SQL into the empty Turso tables with the Turso CLI:

   ```powershell
   Get-Content -Raw $migrationFile | turso db shell <database-name>
   ```

   If an earlier import attempt failed, it may still have inserted rows from
   some tables. Before retrying, either use a fresh Turso database or clear the
   rows in the four application tables first. Only clear them if this database
   contains no other data you need:

   ```bash
   printf 'DELETE FROM account_ledger;\nDELETE FROM user_transactions;\nDELETE FROM password_reset_tokens;\nDELETE FROM users;\n' | turso db shell <database-name>
   ```

4. Redeploy after the import so the app's startup migration can update any
   legacy plaintext records before serving normal traffic.

The generated SQL file contains sensitive account information, including
password hashes. Keep it outside the repository, private, and delete it after
verifying the import. Do not run the import more than once against the same
database.
