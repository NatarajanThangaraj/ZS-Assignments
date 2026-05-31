#!/usr/bin/env node
// Scans the repo root for assignment folders and writes sites.json.
// A folder qualifies if it contains index.html and isn't in DENY.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'sites.json');

const DENY = new Set([
  'assets',
  'scripts',
  'node_modules',
  '.git',
  '.github',
  '.claude',
]);

function isAssignmentDir(name) {
  if (name.startsWith('.')) return false;
  if (DENY.has(name)) return false;
  const full = path.join(ROOT, name);
  if (!fs.statSync(full).isDirectory()) return false;
  return fs.existsSync(path.join(full, 'index.html'));
}

function readMeta(slug) {
  const metaPath = path.join(ROOT, slug, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  } catch (e) {
    console.warn(`[${slug}] meta.json invalid: ${e.message}`);
    return null;
  }
}

function readHtmlFallback(slug) {
  const html = fs.readFileSync(path.join(ROOT, slug, 'index.html'), 'utf8');
  const title = (html.match(/<title>([^<]+)<\/title>/i) || [])[1]?.trim();
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1]?.trim();
  return { title, description: desc };
}

function findThumbnail(slug) {
  for (const name of ['thumbnail.png', 'thumbnail.jpg', 'thumbnail.svg', 'screenshot.png']) {
    if (fs.existsSync(path.join(ROOT, slug, name))) return `${slug}/${name}`;
  }
  return null;
}

function gitUpdated(slug) {
  try {
    const out = execSync(`git log -1 --format=%cI -- "${slug}"`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    return out || null;
  } catch {
    return null;
  }
}

function fsUpdated(slug) {
  const stat = fs.statSync(path.join(ROOT, slug, 'index.html'));
  return new Date(stat.mtimeMs).toISOString();
}

function build() {
  const slugs = fs.readdirSync(ROOT).filter(isAssignmentDir).sort();
  const sites = slugs.map(slug => {
    const meta = readMeta(slug) || {};
    const fallback = readHtmlFallback(slug);
    return {
      slug,
      title: meta.title || fallback.title || slug,
      description: meta.description || fallback.description || '',
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      thumbnail: meta.thumbnail || findThumbnail(slug),
      updated: gitUpdated(slug) || fsUpdated(slug),
    };
  });

  sites.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  fs.writeFileSync(OUT, JSON.stringify(sites, null, 2) + '\n');
  console.log(`Wrote ${OUT} with ${sites.length} site${sites.length === 1 ? '' : 's'}.`);
  sites.forEach(s => console.log(`  • ${s.slug}  —  ${s.title}`));
}

build();
