/**
 * RVAS Newsletter — Production Build Script
 * Generates js/config.js dynamically from environment variables
 * during Vercel deployment (or local builds).
 */
const fs = require('fs');
const path = require('path');

// 1. Check for local .env or .env.local file if process.env is not yet populated
function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnvFile(path.join(__dirname, '.env.local'));
loadEnvFile(path.join(__dirname, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const jsDir = path.join(__dirname, 'js');
const configPath = path.join(jsDir, 'config.js');

if (!fs.existsSync(jsDir)) {
  fs.mkdirSync(jsDir, { recursive: true });
}

if (supabaseUrl && supabaseAnonKey) {
  const content = `/**
 * Supabase Configuration — RVAS Newsletter
 * Generated automatically during build from environment variables.
 */
window.SUPABASE_CONFIG = {
  url: ${JSON.stringify(supabaseUrl)},
  anonKey: ${JSON.stringify(supabaseAnonKey)}
};
`;
  fs.writeFileSync(configPath, content, 'utf8');
  console.log('[RVAS Build] ✓ Successfully generated js/config.js from environment variables.');
} else if (fs.existsSync(configPath)) {
  console.log('[RVAS Build] ℹ No environment variables detected, preserving existing js/config.js.');
} else {
  console.warn('[RVAS Build] ⚠ SUPABASE_URL or SUPABASE_ANON_KEY not set. Generating placeholder config.');
  const placeholderContent = `/**
 * Supabase Configuration — RVAS Newsletter
 * Placeholder generated during build. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.
 */
window.SUPABASE_CONFIG = {
  url: '',
  anonKey: ''
};
`;
  fs.writeFileSync(configPath, placeholderContent, 'utf8');
}

console.log('[RVAS Build] Build completed successfully.');
