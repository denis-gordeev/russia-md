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

const folderToRouteCategory = new Map(
  categoryFolders.map((folder) => [folder, folder.toLowerCase()]),
);

const ciMode = process.argv.includes('--ci');
const stagedMode = process.argv.includes('--staged');
const ciDiffBase = process.env.CONTENT_DIFF_BASE?.trim();

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const line = before.split('\n').length;
  const lastLineStart = before.lastIndexOf('\n');
  const column = index - lastLineStart;
  return { line, column };
}

async function getSelectedPaths() {
  if (!stagedMode && !ciMode) {
    return null;
  }

  try {
    const resolvedCiBase =
      ciMode &&
      ciDiffBase &&
      ciDiffBase !== '0000000000000000000000000000000000000000'
        ? ciDiffBase
        : 'HEAD~1';
    const args = stagedMode
      ? [
          'diff',
          '--cached',
          '--name-only',
          '--diff-filter=ACMR',
          '--',
          'russia-knowledge',
        ]
      : [
          'diff',
          '--name-only',
          '--diff-filter=ACMR',
          resolvedCiBase,
          'HEAD',
          '--',
          'russia-knowledge',
        ];

    const { stdout } = await execFile('git', args);

    const files = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.endsWith('.md'));

    return new Set(files);
  } catch (error) {
    if (ciMode) {
      console.warn(
        `Warning: could not resolve CI markdown diff, skipping internal reference validation. ${error.message}`,
      );
      process.exit(0);
    }

    console.warn(
      `Warning: could not resolve staged markdown files, falling back to full scan. ${error.message}`,
    );
    return null;
  }
}

function normalizeInternalPath(rawPath) {
  return rawPath.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
}

function findKnownArticles(articles) {
  const validRoutes = new Set();
  const validSlugs = new Set();
  const validTitles = new Set();

  for (const article of articles) {
    validRoutes.add(`/${article.category}/${article.slug}`);
    validSlugs.add(article.slug);
    if (typeof article.title === 'string' && article.title.trim() !== '') {
      validTitles.add(article.title.trim());
    }
  }

  return { validRoutes, validSlugs, validTitles };
}

function collectMarkdownLinkErrors({
  body,
  relativePath,
  validRoutes,
  errors,
}) {
  const markdownLinkPattern = /\]\((\/[^)\s]+)\)/g;

  for (const match of body.matchAll(markdownLinkPattern)) {
    const rawPath = match[1];
    const normalizedPath = normalizeInternalPath(rawPath);

    if (normalizedPath === '/') {
      continue;
    }

    const parts = normalizedPath.split('/').filter(Boolean);
    if (parts.length !== 2) {
      continue;
    }

    const [category, slug] = parts;
    const { line, column } = lineAndColumn(body, match.index);

    if (category !== category.toLowerCase()) {
      errors.push(
        `${relativePath}:${line}:${column}: internal link category must be lowercase: ${rawPath}`,
      );
      continue;
    }

    const canonicalPath = `/${category}/${slug}`;
    if (!validRoutes.has(canonicalPath)) {
      errors.push(
        `${relativePath}:${line}:${column}: internal link target does not exist: ${rawPath}`,
      );
    }
  }
}

function collectWikilinkErrors({
  body,
  relativePath,
  validSlugs,
  validTitles,
  errors,
}) {
  const wikilinkPattern = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

  for (const match of body.matchAll(wikilinkPattern)) {
    const target = match[1].trim();
    if (target === '') {
      continue;
    }

    if (validSlugs.has(target) || validTitles.has(target)) {
      continue;
    }

    const { line, column } = lineAndColumn(body, match.index);
    errors.push(
      `${relativePath}:${line}:${column}: wikilink target does not match a known article slug or title: [[${target}]]`,
    );
  }
}

const selectedPaths = await getSelectedPaths();
const allArticles = [];

for (const folderName of categoryFolders) {
  const categoryDir = path.join(knowledgeRoot, folderName);
  let entries = [];

  try {
    entries = await readdir(categoryDir, { withFileTypes: true });
  } catch {
    continue;
  }

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
    const raw = await readFile(absolutePath, 'utf-8');
    const parsed = matter(raw);

    allArticles.push({
      relativePath,
      body: parsed.content,
      slug: path.basename(entry.name, '.md').normalize('NFC'),
      title: parsed.data.title,
      category: folderToRouteCategory.get(folderName),
    });
  }
}

const { validRoutes, validSlugs, validTitles } = findKnownArticles(allArticles);
const errors = [];
let scannedFiles = 0;

for (const article of allArticles) {
  if (selectedPaths && !selectedPaths.has(article.relativePath)) {
    continue;
  }

  scannedFiles += 1;
  collectMarkdownLinkErrors({
    body: article.body,
    relativePath: article.relativePath,
    validRoutes,
    errors,
  });
  collectWikilinkErrors({
    body: article.body,
    relativePath: article.relativePath,
    validSlugs,
    validTitles,
    errors,
  });
}

if (scannedFiles === 0) {
  console.log(
    'No content markdown files matched the current selection; no internal references to validate.',
  );
  process.exit(0);
}

if (errors.length > 0) {
  console.error(
    `Internal reference validation failed with ${errors.length} error(s):`,
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Internal reference validation passed for ${scannedFiles} content file(s).`,
);
