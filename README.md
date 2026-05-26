# Stormforge Archive

A cinematic dark-fantasy worldbuilding archive. Forge kingdoms. Archive legends.

Built with **Astro + Tailwind CSS**. Deployed to **GitHub Pages**.

## Local development

```bash
npm install
npm run dev          # http://localhost:4321/stormforge/
npm run build        # outputs to ./dist
npm run preview
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and publishes it to GitHub Pages. The live URL is set in `astro.config.mjs`:

```
https://dreamhelpers2025.github.io/stormforge/
```

## Brand

| Token | Hex | Use |
|---|---|---|
| Tempest Navy | `#0B1E2D` | primary background |
| Abyss Blue | `#143447` | cards, overlays |
| Storm Teal | `#1E7C86` | buttons, accents |
| Dragonfire Cyan | `#43C7C7` | glows, links, active states |
| Fog Gray | `#B5C0C9` | secondary text |
| Ancient Silver | `#D8E0E5` | headings |
| Ember Gold | `#B88A3B` | rare/legendary accents |

Headings use **Cinzel**, body uses **Inter**, accents use **Cormorant Garamond**.
