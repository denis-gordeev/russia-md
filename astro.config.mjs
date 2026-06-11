// @ts-check
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

function loadContentDates() {
  try {
    const filePath = resolve(process.cwd(), 'src/data/content-dates.json');
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

const contentDates = loadContentDates();

function getLastmodForUrl(url) {
  try {
    const pathname = new URL(url).pathname.replace(/\/+$/, '') || '/';
    const isoDate = contentDates[pathname];
    return isoDate ? new Date(isoDate) : undefined;
  } catch {
    return undefined;
  }
}

export default defineConfig({
  site: 'https://russia-md.ru',
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      customPages: ['https://russia-md.ru/?changefreq=daily&priority=1.0'],
      serialize(item) {
        const lastmod = getLastmodForUrl(item.url);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
  build: {
    concurrency: 4,
    inlineStylesheets: 'auto',
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
  vite: {
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 10000,
      rollupOptions: {
        output: {
          // Match the upstream large-SSG tuning: avoid spending extra time on
          // chunk splitting when most routes ship tiny page-specific bundles.
          manualChunks: undefined,
        },
      },
    },
    esbuild: {
      target: 'es2022',
      minifyIdentifiers: false,
      minifySyntax: true,
      minifyWhitespace: true,
    },
    optimizeDeps: {
      force: false,
    },
  },
});
