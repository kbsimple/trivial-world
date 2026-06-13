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

// Read pack index from dist (already copied from public/ before this script runs)
let packs = [];
try {
  const packIndex = JSON.parse(readFileSync(resolve(rootDir, 'dist', 'api', 'v1', 'packs.json'), 'utf8'));
  packs = (packIndex.packs || []).map(p => ({
    id: p.id,
    name: p.name,
    version: p.version,
    totalQuestions: p.totalQuestions,
  }));
} catch {
  // Pack index not present (e.g. running outside of full build) — omit
}

// Netlify CI env vars are more reliable than git in detached-HEAD CI clones.
const commit =
  process.env.COMMIT_REF ||
  git('git rev-parse HEAD') ||
  'unknown';

// Netlify CI checks out a detached HEAD, so git rev-parse returns "HEAD".
// Fall back to the ref annotation in the latest commit log entry.
const rawBranch = git('git rev-parse --abbrev-ref HEAD');
function branchFromRefAnnotation() {
  const refs = git('git log --oneline -1 --pretty=format:%D');
  if (!refs) return null;
  // "HEAD -> main, origin/main" → extract the local branch after "->"
  const m = refs.match(/HEAD\s*->\s*([^,\s]+)/);
  if (m) return m[1];
  // "origin/main" → strip origin/ prefix
  const o = refs.match(/origin\/([^,\s]+)/);
  return o ? o[1] : null;
}
const branch =
  process.env.BRANCH ||
  process.env.HEAD ||
  (rawBranch !== 'HEAD' ? rawBranch : null) ||
  branchFromRefAnnotation() ||
  'unknown';

const status = {
  service: 'trivial-world',
  status: 'ok',
  version: pkg.version,
  commit,
  commitShort: commit !== 'unknown' ? commit.slice(0, 8) : 'unknown',
  branch,
  context: process.env.CONTEXT || (process.env.NETLIFY === 'true' ? 'netlify' : 'local'),
  builtAt: new Date().toISOString(),
  // Netlify-specific: present in CI, null locally
  buildId: process.env.BUILD_ID || null,
  deployId: process.env.DEPLOY_ID || null,
  node: process.version,
  packs: { count: packs.length, entries: packs },
};

const outPath = resolve(rootDir, 'dist', 'statusz.json');
writeFileSync(outPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log('statusz →', outPath);
console.log(JSON.stringify(status, null, 2));
