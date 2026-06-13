import { readFileSync } from 'fs';
import { resolve } from 'path';

export type Contributor = {
  name: string;
  login: string;
  href?: string;
};

export type GitInfo = {
  contributors: Contributor[];
  lastModified: string;
};

type ContributorProfile = {
  name: string;
  login: string;
  profile?: string;
};

let contributorProfiles: Map<string, ContributorProfile> | null = null;

function contributorKey(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
}

function githubProfileHref(login: string) {
  const normalized = login.trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(normalized)) {
    return undefined;
  }

  return `https://github.com/${normalized}`;
}

function profileHref(profile: string | undefined) {
  if (!profile) return undefined;

  try {
    const url = new URL(profile);
    if (url.hostname === 'github.com' || url.hostname === 'www.github.com') {
      return url.toString();
    }
  } catch {}

  return undefined;
}

function getContributorProfiles() {
  if (contributorProfiles) return contributorProfiles;

  contributorProfiles = new Map();
  try {
    const configPath = resolve(process.cwd(), '.all-contributorsrc');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));

    for (const contributor of config.contributors || []) {
      if (!contributor.login || !contributor.name) continue;

      const profile = {
        name: contributor.name,
        login: contributor.login,
        profile: contributor.profile,
      };

      contributorProfiles.set(contributorKey(contributor.name), profile);
      contributorProfiles.set(contributorKey(contributor.login), profile);
    }
  } catch (error) {
    console.error('Contributor profile error:', (error as Error).message);
  }

  return contributorProfiles;
}

export function resolveContributor(
  authorName: string,
  authorEmail: string,
): Contributor {
  const githubNoreplyMatch = authorEmail.match(
    /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/i,
  );
  const githubLogin = githubNoreplyMatch?.[1]?.toLowerCase();
  const profile =
    getContributorProfiles().get(contributorKey(githubLogin || '')) ||
    getContributorProfiles().get(contributorKey(authorName));
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

export function emptyGitInfo(): GitInfo {
  return {
    contributors: [],
    lastModified: '',
  };
}

function loadGitInfoFiles(): Record<string, GitInfo> {
  try {
    const raw = readFileSync(
      resolve(process.cwd(), 'src/data/git-info.json'),
      'utf-8',
    );
    return (JSON.parse(raw) as { files?: Record<string, GitInfo> }).files || {};
  } catch {
    return {};
  }
}

const gitInfoFiles = loadGitInfoFiles();
const gitInfoCacheByPrefix = new Map<string, Map<string, GitInfo>>();

export function buildGitInfoCache(pathPrefix: string) {
  const cached = gitInfoCacheByPrefix.get(pathPrefix);
  if (cached) return cached;

  const normalizedPrefix = pathPrefix.endsWith('/')
    ? pathPrefix
    : `${pathPrefix}/`;
  const cache = new Map<string, GitInfo>();

  for (const [relPath, gitInfo] of Object.entries(gitInfoFiles)) {
    if (!relPath.startsWith(normalizedPrefix)) continue;
    const key = resolve(process.cwd(), relPath).normalize('NFC');
    cache.set(key, gitInfo);
  }

  gitInfoCacheByPrefix.set(pathPrefix, cache);
  return cache;
}
