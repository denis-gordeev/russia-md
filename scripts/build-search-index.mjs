import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

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

async function readCategoryIndex(baseDir, slugPrefix = '', lang = 'en') {
  const items = [];

  for (const [slug, folder] of Object.entries(CATEGORY_FOLDER_MAPPING)) {
    try {
      const dirPath = path.resolve(process.cwd(), baseDir, folder);
      const files = await readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith('.md') || file.startsWith('_')) continue;

        try {
          const source = await readFile(path.join(dirPath, file), 'utf-8');
          const { data } = matter(source);
          const name = path.basename(file, '.md').normalize('NFC');

          items.push({
            t: data.title || name,
            d: data.description || '',
            u: `${slugPrefix}/${slug}/${encodeURIComponent(name)}`,
            tags: Array.isArray(data.tags)
              ? data.tags.map((tag) => String(tag))
              : [],
            lang,
          });
        } catch {}
      }
    } catch {}
  }

  return items;
}

const searchIndex = [
  ...(await readCategoryIndex('russia-knowledge', '', 'en')),
  ...(await readCategoryIndex(
    path.join('russia-knowledge', 'en'),
    '/en',
    'en',
  )),
];

const outputPath = path.resolve(process.cwd(), 'public/api/search-index.json');
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(searchIndex, null, 2)}\n`);

console.log(
  `build-search-index: wrote ${searchIndex.length} item(s) to public/api/search-index.json`,
);
