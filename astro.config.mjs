// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  site: 'https://russia-md.ru',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: ['https://russia-md.ru/?changefreq=daily&priority=1.0'],
    }),
  ],
  build: {
    concurrency: 4,
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
      langs: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'astro',
        'bash',
        'sh',
        'md',
        'json',
        'yaml',
        'html',
        'css',
        'python',
        'go',
        'rust',
        'sql',
        'diff',
        'plaintext',
      ],
    },
    rehypePlugins: [
      [
        rehypeExternalLinks,
        { target: '_blank', rel: ['noopener', 'noreferrer'] },
      ],
    ],
  },
});
