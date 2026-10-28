const dotenv = require('dotenv');
const { createClient } = require('@tursodatabase/serverless/compat');
const { createHmac } = require('crypto');
const readline = require('readline/promises');

if (!process.env.ENV_FILE) {
  throw new Error('Set ENV_FILE to the environment file for the database you intend to change.');
}
dotenv.config({ path: process.env.ENV_FILE, override: true });

const email = process.argv[2]?.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error('Usage: node scripts/promote-user-to-admin.js <account-email>');
  process.exit(1);
}

if (!/^[a-f\d]{64}$/i.test(process.env.PROFILE_ENCRYPTION_KEY || '')) {
  throw new Error('PROFILE_ENCRYPTION_KEY must be a 64-character hexadecimal key.');
}
if (!process.env.TURSO_DATABASE_URL || !/^(libsql|https):\/\//.test(process.env.TURSO_DATABASE_URL)) {
  throw new Error('TURSO_DATABASE_URL must be a Turso libsql:// or https:// database URL.');
}
if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error('TURSO_AUTH_TOKEN must be configured.');
}

const normalizedEmail = email.toLowerCase();
const emailLookup = createHmac('sha256', Buffer.from(process.env.PROFILE_ENCRYPTION_KEY, 'hex'))
  .update(`beforeinvest:email-index:v1:${normalizedEmail}`)
  .digest('hex');
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function main() {
  const result = await db.execute('SELECT id, role FROM users WHERE email_lookup = ?', [emailLookup]);
  if (result.rows.length !== 1) {
    throw new Error(result.rows.length === 0
      ? 'No account matched that email in the configured database. Register on the live site first.'
      : 'Multiple accounts matched; no changes were made.');
  }

  const user = result.rows[0];
  console.log(`Matching account found. Current role: ${user.role || 'user'}.`);
  console.log('Database connection loaded from the selected environment file.');

  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const confirmation = await prompt.question('Type PROMOTE to grant this account admin access: ');
    if (confirmation !== 'PROMOTE') {
      console.log('No changes made.');
      return;
    }
  } finally {
    prompt.close();
  }

  if (user.role === 'admin') {
    console.log('This account is already an admin. No changes made.');
    return;
  }

  const update = await db.execute('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id]);
  if (update.rowsAffected !== 1) {
    throw new Error('Expected to update exactly one account; no success was reported.');
  }
  console.log('Admin role granted. Admin sign-in requires the configured email verification service.');
}

main().catch((error) => {
  console.error('Could not promote account:', error.message);
  process.exitCode = 1;
});
