import type { APIRoute } from 'astro';
import { readdir } from 'fs/promises';
import { basename, resolve } from 'path';
import { categoryFolderMapping } from '../../utils/categoryConfig';

type RandomIndex = {
  byCat: Record<string, string[]>;
};

export const GET: APIRoute = async () => {
  const byCat: RandomIndex['byCat'] = {};

  for (const [slug, folder] of Object.entries(categoryFolderMapping)) {
    try {
      const dirPath = resolve(process.cwd(), 'russia-knowledge', folder);
      const files = await readdir(dirPath);

      byCat[slug] = files
        .filter((entry) => entry.endsWith('.md') && !entry.startsWith('_'))
        .map(
          (entry) =>
            `/${slug}/${encodeURIComponent(basename(entry, '.md').normalize('NFC'))}`,
        );
    } catch {
      byCat[slug] = [];
    }
  }

  return new Response(JSON.stringify({ byCat }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
