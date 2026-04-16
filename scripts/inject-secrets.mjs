/**
 * Post-build script: replaces __PLACEHOLDER__ tokens in dist/ config files
 * with values from environment variables (e.g. Cloudflare Pages build secrets).
 *
 * Usage:  node scripts/inject-secrets.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIST = join(import.meta.dirname, '..', 'dist');

/** Map of placeholder → env-var name */
const SECRETS = {
  __WU_API_KEY__: 'wu_api_key',
};

/** Config files that may contain placeholders */
const CONFIG_FILES = [
  'config.js',
  'config.json',
  'config_jsonp.js',
];

let replaced = 0;

for (const file of CONFIG_FILES) {
  const filePath = join(DIST, file);
  if (!existsSync(filePath)) continue;

  let content = readFileSync(filePath, 'utf-8');
  let changed = false;

  for (const [placeholder, envVar] of Object.entries(SECRETS)) {
    const value = process.env[envVar];
    if (value && content.includes(placeholder)) {
      content = content.replaceAll(placeholder, value);
      changed = true;
      replaced++;
      console.log(`  ✔ ${file}: replaced ${placeholder}`);
    }
  }

  if (changed) {
    writeFileSync(filePath, content, 'utf-8');
  }
}

if (replaced === 0) {
  console.log('inject-secrets: no substitutions made (env vars may not be set)');
} else {
  console.log(`inject-secrets: ${replaced} substitution(s) applied`);
}
