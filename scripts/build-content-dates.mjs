import { execSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CATEGORY_FOLDER_MAPPING = {
  history: 'History',
  geography: 'Geography',
  culture: 'Culture',
  food: 'Food',
  art: 'Art',
  music: 'Music',
  technology: 'Technology',
  nature: 'Nature',
  people: 'People',
  society: 'Society',
  economy: 'Economy',
  lifestyle: 'Lifestyle',
};

const STATIC_ROUTE_FILES = {
  '/': 'src/pages/index.astro',
  '/about': 'src/pages/about.astro',
  '/contribute': 'src/pages/contribute.astro',
  '/resources': 'src/pages/resources.astro',
  '/feed.xml': 'src/pages/feed.xml.ts',
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '');
}

function maxIsoDate(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function buildGitDateMap(paths) {
  const byFile = new Map();

  try {
    const quotedPaths = paths.map((entry) => `"${entry}"`).join(' ');
    const logOutput = execSync(
      `git -c core.quotePath=false log --full-history -z --name-only --format="COMMIT|%aI" -- ${quotedPaths}`,
      { encoding: 'utf-8', maxBuffer: 25 * 1024 * 1024 },
    );

    let currentDate = '';
    for (let token of logOutput.split('\0')) {
      token = token.replace(/^\n+/, '').trim();
      if (!token) continue;

      if (token.startsWith('COMMIT|')) {
        currentDate = token.slice('COMMIT|'.length);
        continue;
      }

      if (!currentDate || byFile.has(token)) continue;
      byFile.set(token.normalize('NFC'), currentDate);
    }
  } catch (error) {
    console.error(
      'build-content-dates: failed to read git history:',
      error.message,
    );
  }

  return byFile;
}

function buildRouteDateMap(byFile) {
  const routeDates = {};
  const latestByCategory = {};
  let latestOverall = '';

  for (const [route, file] of Object.entries(STATIC_ROUTE_FILES)) {
    const date = byFile.get(file);
    if (!date) continue;
    routeDates[route] = date;
    latestOverall = maxIsoDate(latestOverall, date);
  }

  for (const [categorySlug, folderName] of Object.entries(
    CATEGORY_FOLDER_MAPPING,
  )) {
    const prefix = `russia-knowledge/${folderName}/`;

    for (const [file, date] of byFile.entries()) {
      if (!file.startsWith(prefix) || !file.endsWith('.md')) continue;

      const slug = path.basename(file, '.md').normalize('NFC');
      const articleRoute = `/${categorySlug}/${slug}`;
      routeDates[articleRoute] = date;

      latestByCategory[categorySlug] = maxIsoDate(
        latestByCategory[categorySlug],
        date,
      );
      latestOverall = maxIsoDate(latestOverall, date);
    }
  }

  for (const [categorySlug, date] of Object.entries(latestByCategory)) {
    routeDates[`/${categorySlug}`] = date;
  }

  if (latestOverall) {
    routeDates['/'] = maxIsoDate(routeDates['/'], latestOverall);
    routeDates['/feed.xml'] = maxIsoDate(
      routeDates['/feed.xml'],
      latestOverall,
    );
  }

  return Object.fromEntries(
    Object.entries(routeDates)
      .map(([route, date]) => [normalizePathname(route), date])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

const trackedPaths = [...Object.values(STATIC_ROUTE_FILES), 'russia-knowledge'];

const gitDates = buildGitDateMap(trackedPaths);
const routeDates = buildRouteDateMap(gitDates);

const outputPath = path.resolve(process.cwd(), 'src/data/content-dates.json');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(routeDates, null, 2)}\n`);

console.log(
  `build-content-dates: wrote ${Object.keys(routeDates).length} route date(s) to src/data/content-dates.json`,
);
