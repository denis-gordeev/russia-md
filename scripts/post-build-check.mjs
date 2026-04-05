import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { categoryConfig } from '../src/utils/categoryConfig.ts';

const distRoot = path.join(process.cwd(), 'dist');
const categories = Object.keys(categoryConfig);
const errors = [];
const warnings = [];

async function countHtmlFiles(dir) {
  let total = 0;

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await countHtmlFiles(fullPath);
      } else if (entry.name.endsWith('.html')) {
        total += 1;
      }
    }
  } catch (error) {
    errors.push(`Could not read ${dir}: ${error.message}`);
  }

  return total;
}

const totalPages = await countHtmlFiles(distRoot);
const minimumExpectedPages = categories.length * 2;

console.log(`Post-build check: ${totalPages} HTML page(s) in dist/`);

if (totalPages < minimumExpectedPages) {
  errors.push(
    `Expected at least ${minimumExpectedPages} HTML pages, found ${totalPages}.`,
  );
}

for (const category of categories) {
  const categoryDir = path.join(distRoot, category);
  try {
    const entries = await readdir(categoryDir, { withFileTypes: true });
    const articleDirs = entries.filter(
      (entry) => entry.isDirectory() && entry.name !== 'index',
    );

    if (articleDirs.length < 1) {
      errors.push(`/${category}/ has no article pages in dist/.`);
      continue;
    }

    const indexPath = path.join(categoryDir, 'index.html');
    const indexHtml = await readFile(indexPath, 'utf-8');
    if (!indexHtml.includes('articles-grid')) {
      warnings.push(
        `/${category}/index.html is missing the article grid marker.`,
      );
    }

    const sampleArticle = articleDirs[0];
    const articleIndexPath = path.join(
      categoryDir,
      sampleArticle.name,
      'index.html',
    );
    const articleStats = await stat(articleIndexPath);
    if (articleStats.size < 1500) {
      warnings.push(
        `/${category}/${sampleArticle.name}/index.html looks unusually small (${articleStats.size} bytes).`,
      );
    }
  } catch (error) {
    errors.push(
      `Missing or unreadable dist output for /${category}/: ${error.message}`,
    );
  }
}

if (warnings.length > 0) {
  console.warn(`Post-build check emitted ${warnings.length} warning(s):`);
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (errors.length > 0) {
  console.error(`Post-build check failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Post-build check passed.');
