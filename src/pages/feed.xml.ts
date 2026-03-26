import { readdir, readFile } from 'fs/promises';
import { resolve, join, basename } from 'path';
import matter from 'gray-matter';

const siteUrl = 'https://russia-md.ru';
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const articles: Array<{
    title: string;
    description: string;
    link: string;
    pubDate: string;
    category: string;
  }> = [];

  for (const [categorySlug, folderName] of Object.entries(categoryMapping)) {
    try {
      const folderPath = resolve(process.cwd(), 'russia-knowledge', folderName);
      const files = await readdir(folderPath);
      const markdownFiles = files.filter(
        (file) => file.endsWith('.md') && !file.startsWith('_'),
      );

      for (const file of markdownFiles) {
        try {
          const filePath = join(folderPath, file);
          const fileContent = await readFile(filePath, 'utf-8');
          const { data: frontmatter, content } = matter(fileContent);
          const slug = basename(file, '.md');
          const description =
            frontmatter.description ||
            content
              .replace(/[\n\r]+/g, ' ')
              .replace(/[#*`>-]/g, '')
              .trim()
              .slice(0, 220);

          articles.push({
            title: frontmatter.title || slug,
            description,
            link: `${siteUrl}/${categorySlug}/${slug}`,
            pubDate: new Date(frontmatter.date || Date.now()).toUTCString(),
            category: categorySlug,
          });
        } catch {}
      }
    } catch {}
  }

  articles.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Russia.md</title>
    <description>Open-source, AI-friendly knowledge base about Russia.</description>
    <link>${siteUrl}</link>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
${articles
  .slice(0, 50)
  .map(
    (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <description>${escapeXml(article.description)}</description>
      <link>${article.link}</link>
      <guid isPermaLink="true">${article.link}</guid>
      <pubDate>${article.pubDate}</pubDate>
      <category>${article.category}</category>
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
