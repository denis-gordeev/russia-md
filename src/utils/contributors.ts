import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

export type Contributor = {
  name: string;
  login: string;
};

export type GitInfo = {
  contributors: Contributor[];
  lastModified: string;
};

type ContributorProfile = {
  name: string;
  login: string;
};

let contributorProfiles: Map<string, ContributorProfile> | null = null;

function contributorKey(value: string) {
  return value.toLowerCase().replace(/[\s._-]+/g, '');
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
  const displayName =
    authorName &&
    contributorKey(authorName) !== contributorKey(profile?.login || '')
      ? authorName
      : profile?.name || authorName || login;

  return {
    name: displayName,
    login,
  };
}

export function emptyGitInfo(): GitInfo {
  return {
    contributors: [],
    lastModified: '',
  };
}

export function buildGitInfoCache(pathPrefix: string) {
  const cache = new Map<string, GitInfo>();

  try {
    const logOutput = execSync(
      `git -c core.quotePath=false log --full-history -z --name-only --format="COMMIT|%aI|%an|%ae" -- "${pathPrefix}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
    );
    let currentDate = '';
    let currentContributor: Contributor | null = null;

    for (let token of logOutput.split('\0')) {
      token = token.replace(/^\n+/, '').trim();
      if (!token) continue;

      if (token.startsWith('COMMIT|')) {
        const parts = token.split('|');
        currentDate = parts[1] || '';
        currentContributor = resolveContributor(parts[2] || '', parts[3] || '');
        continue;
      }

      if (!token.startsWith(pathPrefix) || !token.endsWith('.md')) continue;

      const key = resolve(process.cwd(), token).normalize('NFC');
      let entry = cache.get(key);

      if (!entry) {
        entry = {
          contributors: [],
          lastModified: currentDate,
        };
        cache.set(key, entry);
      }

      if (
        currentContributor &&
        !entry.contributors.some(
          (contributor) => contributor.login === currentContributor?.login,
        )
      ) {
        entry.contributors.push(currentContributor);
      }
    }
  } catch (error) {
    console.error('Git cache error:', (error as Error).message);
  }

  return cache;
}
