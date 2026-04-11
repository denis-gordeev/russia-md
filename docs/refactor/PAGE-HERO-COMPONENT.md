# PageHero — shared page hero component

**Status**: shipped 2026-04-11
**Location**: `src/components/PageHero.astro`
**Complements**: `ArticleHero.astro` (individual articles with cover image + breadcrumb)

The top-level section index pages (`/soundscape`, `/resources`, `/contribute`, `/data`, `/map`, `/assets`, `/changelog`) used to each hand-roll their own hero section. Adding a new hero axis (e.g. the broken `📊` emoji on `/data` that kept falling back to a box) meant editing one page at a time, and visual consistency drifted. `PageHero` collapses all those heroes into one component driven by enum props + slots.

## Pattern matrix (7 migrated pages, as of 2026-04-11)

| Page                        | bgVariant  | tone  | titleVariant | titleFont | titleSize | containerWidth | Special slots           |
| --------------------------- | ---------- | ----- | ------------ | --------- | --------- | -------------- | ----------------------- |
| `/soundscape` (all 4 langs) | `none`     | light | `solid`      | display   | lg        | full           | eyebrow / meta / footer |
| `/resources`                | `none`     | light | `gradient`   | display   | lg        | full           | —                       |
| `/contribute`               | `gradient` | dark  | `inherit`    | display   | lg        | full           | note                    |
| `/map`                      | `solid`    | dark  | `inherit`    | display   | lg        | wide           | eyebrow                 |
| `/data`                     | `none`     | dark  | `gradient`   | display   | clamp     | wide           | default (extra desc)    |
| `/assets`                   | `none`     | light | `solid`      | **sans**  | sm        | full           | —                       |
| `/changelog`                | `none`     | light | `solid`      | **sans**  | sm        | full           | meta (embedded link)    |

## Deliberately not migrated

Some pages have enough visual quirks that unifying them through `PageHero` would require ≥3 new props, each with one consumer. The ROI is negative — the API bloats for a single edge case, and the consistency gain is cosmetic.

- **`/taiwan-shape`** — `font-extrabold` (not black), `clamp(2.2rem,6vw,3.6rem)`, `leading-[1.15]`, 820px inner width, `tracking-[0.08em]` eyebrow. Editorial voice is intentionally narrower and quieter than the big display heroes.
- **`/dashboard`** — 2rem title with an animated SVG background sibling. Structurally different shape; would need a `<slot name="background">` axis just for this one page.
- **`/about`** — the "hero" there is actually a section heading inside an existing multi-section page, not a top page hero. Different component entirely.

If these grow a second or third consumer each, revisit the decision and add the needed props.

## API

### Props

```ts
interface Props {
  // ── Content (slot overrides prop) ──
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  subtitleHtml?: string; // for i18n set:html patterns

  // ── Title styling ──
  titleVariant?: 'solid' | 'gradient' | 'inherit'; // default 'solid'
  titleColor?: string; // when variant='solid'
  titleGradient?: string; // CSS `linear-gradient(...)` when variant='gradient'
  titleSize?: 'sm' | 'md' | 'lg' | 'clamp'; // default 'lg'
  titleFont?: 'display' | 'sans'; // default 'display'
  titleWeight?: 'normal' | 'bold' | 'extrabold' | 'black'; // default 'black'
  titleTracking?: 'tight' | 'normal' | 'wide'; // default 'tight'

  // ── Background / tone ──
  tone?: 'light' | 'dark'; // default 'light'
  bgVariant?: 'none' | 'solid' | 'gradient'; // default 'none'
  bgColor?: string; // when bgVariant='solid'
  bgGradient?: string; // when bgVariant='gradient'

  // ── Layout ──
  containerWidth?: 'narrow' | 'default' | 'wide' | 'full'; // default 'default'
  padding?: 'compact' | 'default' | 'spacious'; // default 'default'

  // ── Accent ──
  accentColor?: string; // eyebrow color; falls back to tone default
}
```

### Enum value meanings

| Prop             | Value      | CSS / behavior                                                                             |
| ---------------- | ---------- | ------------------------------------------------------------------------------------------ |
| `titleSize`      | `sm`       | `text-[2.2rem]` responsive → `1.6rem` (assets)                                             |
|                  | `md`       | `text-[2.8rem]` responsive → `2rem` (en/soundscape)                                        |
|                  | `lg`       | `text-[3.5rem]` responsive → `2.5rem → 2rem` (default)                                     |
|                  | `clamp`    | `text-[clamp(2.5rem,6vw,3.5rem)]` (data)                                                   |
| `titleFont`      | `display`  | adds `hero-title` class → justfont injects rixingsong-semibold                             |
|                  | `sans`     | `font-['jf-jinxuanlatte','Noto_Sans_TC','Source_Han_Sans_TC',sans-serif]`, no `hero-title` |
| `titleTracking`  | `tight`    | `-tracking-[0.02em]` (default — display faces)                                             |
|                  | `normal`   | no tracking                                                                                |
|                  | `wide`     | `tracking-[0.05em]` (changelog — spaced-out look)                                          |
| `containerWidth` | `narrow`   | `max-w-[900px]`                                                                            |
|                  | `default`  | `max-w-[1000px]`                                                                           |
|                  | `wide`     | `max-w-[1200px]`                                                                           |
|                  | `full`     | no max (for pages wrapped in their own container, or full-bleed with bg)                   |
| `padding`        | `compact`  | `py-8` (responsive `py-6`)                                                                 |
|                  | `default`  | `py-16` (responsive `py-8`)                                                                |
|                  | `spacious` | `py-20` (responsive `py-12`)                                                               |

### Slots

All optional. A slot, when present, **overrides** the matching prop.

| Slot       | Purpose                                             | First seen on                |
| ---------- | --------------------------------------------------- | ---------------------------- |
| `eyebrow`  | Small uppercase kicker above the title              | `/soundscape`                |
| `title`    | `<h1>` content (allows inline HTML)                 | —                            |
| `subtitle` | Subtitle paragraph (use for `<br>`, `<span>`, etc.) | `/soundscape`                |
| `meta`     | Small stats line under subtitle                     | `/soundscape`                |
| `note`     | Glass-rounded card below meta                       | `/contribute`                |
| `footer`   | Extra link / CTA at the very bottom                 | `/soundscape`                |
| default    | Fallback for fully custom extensions                | `/data` (second description) |

## Critical invariant

**Keep `hero-title` on the `<h1>` whenever `titleFont='display'`.** That class is how justfont's dynamic loader finds the element and injects `rixingsong-semibold`. Remove it and the title silently falls back to whatever the inherited `font-family` is — see `about.template.astro:1433-1437` for the hotfix history.

If a page wants a different display face, use `titleFont='sans'` explicitly. Don't try to hack it in via `titleColor` or some other prop — the font swap is the binary you care about.

## Usage examples

### 1. `/soundscape` — eyebrow + plain solid title + bilingual subtitle + meta + footer link

Sits inside an existing 900px wrapper, so `containerWidth='full'` opts out of extra max-width.

```astro
<PageHero containerWidth="full" titleColor="#1a3c34" accentColor="#065f46">
  <Fragment slot="eyebrow">🎧 Soundscape</Fragment>
  <Fragment slot="title">台灣聲景</Fragment>
  <Fragment slot="subtitle">
    有些故事，用耳朵聽比用眼睛看更真實。<br />
    <span class="text-[0.95rem] italic text-[#64748b]">
      Some stories are best told through ears.
    </span>
  </Fragment>
  <Fragment slot="meta">21 recordings · 23 wanted · 6 categories</Fragment>
  <Fragment slot="footer">
    📖 深度文章：<a href="/music/台灣聲音地景" class="...">台灣聲音地景</a>
  </Fragment>
</PageHero>
```

### 2. `/resources` — gradient-clip title + i18n HTML subtitle

```astro
<PageHero
  containerWidth="full"
  titleVariant="gradient"
  titleGradient="linear-gradient(135deg,#065f46,#059669,#10b981)"
  title={t('resources.hero.title')}
  subtitleHtml={t('resources.hero.subtitle.html')}
/>
```

### 3. `/contribute` — full-bleed gradient bg + white inherited title + note card

```astro
<PageHero
  bgVariant="gradient"
  bgGradient="linear-gradient(135deg,#2d5016,#4a7c59)"
  tone="dark"
  titleVariant="inherit"
  containerWidth="full"
  title={t('contribute.hero.title')}
  subtitle={t('contribute.hero.subtitle')}
>
  <p slot="note" set:html={t('contribute.hero.note.html')} />
</PageHero>
```

### 4. `/map` — solid dark color bg + eyebrow + white inherited title

```astro
<PageHero
  bgVariant="solid"
  bgColor="#1a3c34"
  tone="dark"
  titleVariant="inherit"
  containerWidth="wide"
  eyebrow={t('map.hero.kicker')}
  title={t('map.hero.title')}
  subtitle={t('map.hero.subtitle')}
  accentColor="rgba(255,255,255,0.7)"
/>
```

### 5. `/data` — gradient title + clamp size + extra description in default slot

```astro
<PageHero
  tone="dark"
  titleVariant="gradient"
  titleGradient="linear-gradient(135deg,#38bdf8,#818cf8,#c084fc)"
  titleSize="clamp"
  containerWidth="wide"
  title={t('data.hero.title')}
  subtitle={t('data.hero.subtitle')}
>
  <p class="mx-auto mt-4 max-w-[600px] text-base leading-[1.7] text-[#cbd5e1]">
    {t('data.hero.description')}
  </p>
</PageHero>
```

### 6. `/assets` — sans font, compact padding, solid green color

```astro
<PageHero
  containerWidth="full"
  padding="compact"
  titleFont="sans"
  titleWeight="normal"
  titleTracking="normal"
  titleSize="sm"
  titleColor="#2d5016"
  title={t('assets.hero.title')}
  subtitle={t('assets.hero.subtitle')}
/>
```

### 7. `/changelog` — sans font, wide tracking, custom meta slot with inline link

```astro
<PageHero
  containerWidth="full"
  padding="compact"
  titleFont="sans"
  titleTracking="wide"
  titleSize="sm"
  title={t('changelog.header.title')}
  subtitle={t('changelog.header.subtitle')}
>
  <p slot="meta" class="[&>a]:text-[#3b82f6]">
    {commits.length} updates · {sourceLabel} ·
    <a href="...">GitHub</a>
  </p>
</PageHero>
```

## Gotcha: `tone` refers to the background, not the text

`tone="dark"` means "dark background, light text" — the hero sets `text-white` on the inner container so everything cascades correctly. If you set `tone="dark"` on a page that actually has a _light_ background (e.g. `/en/soundscape`, which looks dark because of the page fonts but whose `<body>` is light), the title will inherit `text-white` and become invisible against the light background.

**Before setting `tone`, inspect the actual `background-color` on `<body>` or the parent container.** Do not infer from font styling.

## Related files

- `src/components/PageHero.astro` — the component
- `src/components/ArticleHero.astro` — sibling for individual article pages (different concern: cover image, breadcrumb, TTS button)
- `src/templates/soundscape.template.astro` — reference consumer using `PageHero` + full data-driven template pattern
- `src/data/soundscape-data.ts` — reference data file showing the `Localized` + `localize()` i18n pattern for complex multi-language data
