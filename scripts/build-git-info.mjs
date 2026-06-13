import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const GITHUB_LOGIN_REGEX = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const KNOWLEDGE_PREFIX = 'russia-knowledge/';

function contributorKey(value) {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
}

function githubProfileHref(login) {
  const normalized = login.trim();
  if (!GITHUB_LOGIN_REGEX.test(normalized)) return undefined;
  return `https://github.com/${normalized}`;
}

function profileHref(profile) {
  if (!profile) return undefined;

  try {
    const url = new URL(profile);
    if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
      return url.toString();
    }
  } catch {}

  return undefined;
}

function loadProfiles() {
  const configPath = path.resolve(process.cwd(), '.all-contributorsrc');
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  const profiles = new Map();

  for (const contributor of config.contributors || []) {
    if (!contributor.login || !contributor.name) continue;

    const profile = {
      name: contributor.name,
      login: contributor.login,
      profile: contributor.profile,
    };

    profiles.set(contributorKey(contributor.name), profile);
    profiles.set(contributorKey(contributor.login), profile);
  }

  return profiles;
}

function resolveContributor(authorName, authorEmail, profiles) {
  const githubNoreplyMatch = authorEmail.match(
    /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i,
  );
  const githubLogin = githubNoreplyMatch?.[1]?.toLowerCase();
  const profile =
    profiles.get(contributorKey(githubLogin || '')) ||
    profiles.get(contributorKey(authorName));
  const login = githubLogin || profile?.login || authorName;
  const href =
    profileHref(profile?.profile) ||
    githubProfileHref(githubLogin || profile?.login || '');
  const displayName =
    authorName &&
    contributorKey(authorName) !== contributorKey(profile?.login || '')
      ? authorName
      : profile?.name || authorName || login;

  return {
    name: displayName,
    login,
    href,
  };
}

function buildGitInfo() {
  const profiles = loadProfiles();
  const result = spawnSync(
    'git',
    [
      '-c',
      'core.quotePath=false',
      'log',
      '--use-mailmap',
      '--full-history',
      '-z',
      '--name-only',
      '--format=COMMIT|%aI|%aN|%aE',
      '--',
      KNOWLEDGE_PREFIX,
    ],
    {
      encoding: 'utf-8',
      maxBuffer: 25 * 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git log exited ${result.status}: ${result.stderr}`);
  }

  const files = {};
  let currentDate = '';
  let currentContributor = null;

  for (let token of result.stdout.split('\0')) {
    token = token.replace(/^\n+/, '').trim();
    if (!token) continue;

    if (token.startsWith('COMMIT|')) {
      const parts = token.split('|');
      currentDate = parts[1] || '';
      currentContributor = resolveContributor(
        parts[2] || '',
        parts[3] || '',
        profiles,
      );
      continue;
    }

    if (!token.startsWith(KNOWLEDGE_PREFIX) || !token.endsWith('.md')) continue;

    const relPath = token.normalize('NFC');
    let entry = files[relPath];

    if (!entry) {
      entry = {
        contributors: [],
        lastModified: currentDate,
      };
      files[relPath] = entry;
    }

    if (
      currentContributor &&
      !entry.contributors.some(
        (contributor) => contributor.login === currentContributor.login,
      )
    ) {
      entry.contributors.push(currentContributor);
    }
  }

  return { files };
}

const gitInfo = buildGitInfo();
const outputPath = path.resolve(process.cwd(), 'src/data/git-info.json');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(gitInfo, null, 2)}\n`);

console.log(
  `build-git-info: wrote ${Object.keys(gitInfo.files).length} file record(s) to src/data/git-info.json`,
);
