import { execFile as execFileCallback } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import matter from 'gray-matter';

const execFile = promisify(execFileCallback);
const repoRoot = process.cwd();
const knowledgeRoot = path.join(repoRoot, 'russia-knowledge');
const categoryFolders = [
  'Art',
  'Culture',
  'Economy',
  'Food',
  'Geography',
  'History',
  'Lifestyle',
  'Music',
  'Nature',
  'People',
  'Society',
  'Technology',
];

const stagedMode = process.argv.includes('--staged');

function isValidDate(value) {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    return false;
  }

  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isStringArray(value) {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

async function getSelectedPaths() {
  if (!stagedMode) {
    return null;
  }

  try {
    const { stdout } = await execFile('git', [
      'diff',
      '--cached',
      '--name-only',
      '--diff-filter=ACMR',
      '--',
      'russia-knowledge',
    ]);

    const files = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('.md'));

    return new Set(files);
  } catch (error) {
    console.warn(
      `Warning: could not resolve staged markdown files, falling back to full scan. ${error.message}`,
    );
    return null;
  }
}

const selectedPaths = await getSelectedPaths();

if (selectedPaths && selectedPaths.size === 0) {
  console.log(
    'No staged content markdown files in russia-knowledge; skipping frontmatter validation.',
  );
  process.exit(0);
}

const errors = [];
let scannedFiles = 0;

for (const category of categoryFolders) {
  const categoryDir = path.join(knowledgeRoot, category);
  let entries = [];

  try {
    entries = await readdir(categoryDir, { withFileTypes: true });
  } catch {
    continue;
  }

  const slugs = new Map();

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith('.md') ||
      entry.name.startsWith('_')
    ) {
      continue;
    }

    const absolutePath = path.join(categoryDir, entry.name);
    const relativePath = path.relative(repoRoot, absolutePath);

    if (selectedPaths && !selectedPaths.has(relativePath)) {
      continue;
    }

    scannedFiles += 1;

    let parsed;
    try {
      parsed = matter(await readFile(absolutePath, 'utf-8'));
    } catch (error) {
      errors.push(
        `${relativePath}: YAML parse error: ${error.message.split('\n')[0]}`,
      );
      continue;
    }

    const slug = path.basename(entry.name, '.md');
    const frontmatter = parsed.data;

    if (slugs.has(slug)) {
      errors.push(
        `${relativePath}: duplicate slug "${slug}" also found in ${slugs.get(slug)}`,
      );
    } else {
      slugs.set(slug, relativePath);
    }

    if (
      typeof frontmatter.title !== 'string' ||
      frontmatter.title.trim() === ''
    ) {
      errors.push(`${relativePath}: missing or invalid "title"`);
    }

    if (
      typeof frontmatter.description !== 'string' ||
      frontmatter.description.trim() === ''
    ) {
      errors.push(`${relativePath}: missing or invalid "description"`);
    }

    if (!isValidDate(frontmatter.date)) {
      errors.push(`${relativePath}: missing or invalid "date"`);
    }

    if (!isStringArray(frontmatter.tags) || frontmatter.tags.length === 0) {
      errors.push(
        `${relativePath}: "tags" must be a non-empty array of strings`,
      );
    }

    if (
      'readingTime' in frontmatter &&
      (typeof frontmatter.readingTime !== 'number' ||
        frontmatter.readingTime <= 0)
    ) {
      errors.push(
        `${relativePath}: "readingTime" must be a positive number when present`,
      );
    }

    if (
      'featured' in frontmatter &&
      typeof frontmatter.featured !== 'boolean'
    ) {
      errors.push(`${relativePath}: "featured" must be boolean when present`);
    }

    if (
      'status' in frontmatter &&
      !['draft', 'published', 'archived'].includes(frontmatter.status)
    ) {
      errors.push(
        `${relativePath}: "status" must be one of draft, published, archived when present`,
      );
    }
  }
}

if (scannedFiles === 0) {
  console.log(
    'No content markdown files matched the current selection; nothing to validate.',
  );
  process.exit(0);
}

if (errors.length > 0) {
  console.error(
    `Frontmatter validation failed with ${errors.length} error(s):`,
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Frontmatter validation passed for ${scannedFiles} content file(s).`,
);
