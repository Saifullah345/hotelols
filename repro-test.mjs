import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

const email = `claude-repro-test-${Date.now()}@example.com`;
const password = 'Test1234!repro';

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
});
if (createErr) { console.error('createUser failed', createErr); process.exit(1); }
const userId = created.user.id;
console.log('created test user', userId);

const anonClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({ email, password });
if (signInErr) { console.error('signIn failed', signInErr); process.exit(1); }
const accessToken = signInData.session.access_token;

fs.writeFileSync('repro-user.json', JSON.stringify({ userId, accessToken, email }, null, 2));
console.log('done');
