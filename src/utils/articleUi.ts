export type ArticleLocale = 'en';

const articleUi = {
  en: {
    home: 'Home',
    english: 'English',
    contributors: 'Contributors',
    lastUpdated: 'Last updated',
    sources: 'Sources',
    shareThisArticle: 'Share this article:',
    shareOnX: 'Share on X',
    shareOnFacebook: 'Share on Facebook',
    copyLink: 'Copy link',
    copied: 'Copied',
    relatedReading: 'Related reading',
    openRandomArticle: 'Open a random article',
    exploreMore: 'Explore more of Russia',
    youMayAlsoLike: 'You may also like',
    helpImprove: 'Help improve this page',
    editOnGitHub: 'Edit on GitHub',
    openIssue: 'Open an issue',
    shareIt: 'Share it',
    shareToX: 'Share to X',
    shareToFacebook: 'Share to Facebook',
    backToCategory: 'Back to {category}',
    backHome: 'Back home',
    minRead: '{n} min read',
  },
} as const;

const dateLocales: Record<ArticleLocale, string> = {
  en: 'en-US',
};

export function getArticleUi(locale: ArticleLocale = 'en') {
  return articleUi[locale] ?? articleUi.en;
}

export function formatArticleDate(
  value: string | Date,
  locale: ArticleLocale = 'en',
) {
  return new Intl.DateTimeFormat(dateLocales[locale] ?? 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(typeof value === 'string' ? new Date(value) : value);
}
