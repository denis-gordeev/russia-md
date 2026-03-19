# Russia.md

An AI-friendly, open-source knowledge atlas about Russia, rebuilt as a Russia-focused starter project.

## Scope

- 12 category structure preserved from the upstream site
- Russia-specific branding, navigation, and category descriptions
- Starter essays for history, geography, culture, food, art, music, technology, nature, people, society, economy, and lifestyle
- [`SKILLS.md`](./SKILLS.md) covering Gosuslugi, VK, Yandex, DaData, CBR, FNS, banks, and marketplace integrations for LLM agents

## Status

This is a foundation project, not a finished editorial product. The active site is driven by a clean Russia corpus under `russia-knowledge/`.

## Development

```bash
npm install
npm run build
```

## Key paths

- `src/` site shell and Astro pages
- `russia-knowledge/` source markdown used by category and article pages
- `public/llms.txt` AI-oriented project summary

## Next work

- Add Russia-specific charts, maps, and supporting datasets
- Add Russia-specific charts and maps
- Expand each category beyond the single starter essay
- Configure a real GitHub remote, domain, and deployment target
