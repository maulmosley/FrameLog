// Reads SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from .env (local) or Vercel Environment Variables,
// then writes public/config.js so the browser app can use them.
const fs = require('fs'), path = require('path');
if (fs.existsSync('.env')) {
  for (const l of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const u = process.env.SUPABASE_URL, k = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!u || !k) { console.error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Set them in .env (local) or Vercel Environment Variables.'); process.exit(1); }
if (/service_role/i.test(k) || k.startsWith('sb_secret_')) { console.error('That looks like a SECRET key. Use the publishable key only.'); process.exit(1); }
fs.writeFileSync(path.join('public', 'config.js'), 'window.ENV=' + JSON.stringify({ SUPABASE_URL: u, SUPABASE_PUBLISHABLE_KEY: k }) + ';\n');
console.log('public/config.js written');
