#!/usr/bin/env node

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawnSync } from 'child_process';

const DEFAULT_PATHS = ['russia-knowledge/'];
const GITHUB_LOGIN_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

function contributorKey(value) {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
}

function isUrlSafeLogin(value) {
  return GITHUB_LOGIN_REGEX.test(value);
}

function loadProfiles() {
  const configPath = resolve(process.cwd(), '.all-contributorsrc');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const profiles = new Map();

  for (const contributor of config.contributors || []) {
    if (!contributor.login || !contributor.name) continue;
    profiles.set(contributorKey(contributor.name), contributor);
    profiles.set(contributorKey(contributor.login), contributor);
  }

  return profiles;
}

function parsePaths(argv) {
  const flag = argv.find((arg) => arg.startsWith('--paths='));
  if (!flag) return DEFAULT_PATHS;

  const values = flag
    .slice('--paths='.length)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : DEFAULT_PATHS;
}

function getCanonicalAuthors(paths) {
  const result = spawnSync(
    'git',
    ['log', '--use-mailmap', '--format=%aN|%aE', '--', ...paths],
    {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git log exited ${result.status}: ${result.stderr}`);
  }

  const authors = new Map();
  for (const line of result.stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf('|');
    if (separatorIndex < 0) continue;

    const name = trimmed.slice(0, separatorIndex);
    const email = trimmed.slice(separatorIndex + 1);
    if (!name) continue;

    const key = `${name}|${email}`;
    if (!authors.has(key)) authors.set(key, { name, email });
  }

  return [...authors.values()];
}

function shouldSkipAuthor({ name, email }) {
  return /@users\.noreply\.github\.com$/i.test(email) || /\[bot\]$/i.test(name);
}

function main() {
  const paths = parsePaths(process.argv.slice(2));

  let profiles;
  try {
    profiles = loadProfiles();
  } catch (error) {
    console.warn(
      `WARN verify-contributors: cannot load .all-contributorsrc - ${error.message}`,
    );
    return 0;
  }

  let authors;
  try {
    authors = getCanonicalAuthors(paths);
  } catch (error) {
    console.warn(
      `WARN verify-contributors: cannot read git log - ${error.message}`,
    );
    return 0;
  }

  const missing = [];
  const unsafe = [];

  for (const author of authors) {
    if (shouldSkipAuthor(author)) continue;

    const profile = profiles.get(contributorKey(author.name));
    if (!profile) {
      missing.push(author);
      continue;
    }

    if (!isUrlSafeLogin(profile.login)) {
      unsafe.push({ name: author.name, login: profile.login });
    }
  }

  if (missing.length === 0 && unsafe.length === 0) {
    console.log(
      `OK verify-contributors: ${paths.join(', ')} authors map cleanly through .all-contributorsrc`,
    );
    return 0;
  }

  console.warn('');
  console.warn(
    `WARN verify-contributors: found contributor metadata gaps for ${paths.join(', ')}`,
  );
  console.warn(
    'WARN verify-contributors: article contributor cards may fall back to raw author names',
  );

  if (missing.length > 0) {
    console.warn('');
    console.warn(`Missing .all-contributorsrc entries (${missing.length}):`);
    for (const { name, email } of missing) {
      console.warn(`  "${name}" <${email}>`);
    }
  }

  if (unsafe.length > 0) {
    console.warn('');
    console.warn(`URL-unsafe profile.login values (${unsafe.length}):`);
    for (const { name, login } of unsafe) {
      console.warn(`  "${name}" -> "${login}"`);
    }
  }

  console.warn('');
  console.warn('WARN verify-contributors: warning only, build continues');
  return 0;
}

process.exit(main());
