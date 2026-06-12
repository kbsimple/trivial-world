#!/usr/bin/env node
/**
 * Generates dist/statusz — a static JSON deployment status file served at /statusz.
 *
 * Run after `expo export`. Netlify env vars take precedence over git commands
 * because CI clones often result in a detached HEAD.
 *
 * Available at /statusz on the deployed site (see public/_headers for Content-Type).
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function git(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, stdio: ['pipe', 'pipe', 'pipe'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));

// Netlify CI env vars are more reliable than git in detached-HEAD CI clones.
const commit =
  process.env.COMMIT_REF ||
  git('git rev-parse HEAD') ||
  'unknown';

const branch =
  process.env.HEAD ||
  git('git rev-parse --abbrev-ref HEAD') ||
  'unknown';

const status = {
  service: 'trivial-world',
  status: 'ok',
  version: pkg.version,
  commit,
  commitShort: commit !== 'unknown' ? commit.slice(0, 8) : 'unknown',
  branch,
  context: process.env.CONTEXT || 'local',
  builtAt: new Date().toISOString(),
  // Netlify-specific: present in CI, null locally
  buildId: process.env.BUILD_ID || null,
  deployId: process.env.DEPLOY_ID || null,
  node: process.version,
};

const outPath = resolve(rootDir, 'dist', 'statusz.json');
writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log('statusz →', outPath);
console.log(JSON.stringify(status, null, 2));
