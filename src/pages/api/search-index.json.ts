import type { APIRoute } from 'astro';
import { readdir, readFile } from 'fs/promises';
import { basename, join, resolve } from 'path';
import matter from 'gray-matter';

const categoryMapping: Record<string, string> = {
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

type SearchItem = {
  t: string;
  d: string;
  u: string;
  tags: string[];
  lang: string;
};

async function readCategoryIndex(
  baseDir: string,
  slugPrefix = '',
  lang = 'en',
): Promise<SearchItem[]> {
  const items: SearchItem[] = [];

  for (const [slug, folder] of Object.entries(categoryMapping)) {
    try {
      const dirPath = resolve(process.cwd(), baseDir, folder);
      const files = await readdir(dirPath);

      for (const file of files.filter(
        (entry) => entry.endsWith('.md') && !entry.startsWith('_'),
      )) {
        const source = await readFile(join(dirPath, file), 'utf-8');
        const { data } = matter(source);
        const name = basename(file, '.md');

        items.push({
          t: data.title || name,
          d: data.description || '',
          u: `${slugPrefix}/${slug}/${name}`,
          tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [],
          lang,
        });
      }
    } catch {}
  }

  return items;
}

export const GET: APIRoute = async () => {
  const searchIndex = [
    ...(await readCategoryIndex('russia-knowledge', '', 'en')),
    ...(await readCategoryIndex(join('russia-knowledge', 'en'), '/en', 'en')),
  ];

  return new Response(JSON.stringify(searchIndex), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
