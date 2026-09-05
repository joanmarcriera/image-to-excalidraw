# image-to-excalidraw Developer Guide

## Purpose
A web app that converts diagram screenshots and SVG files into editable Excalidraw JSON scenes. Front-end runs client-side (GitHub Pages-ready); back-end is optional tiny Node server for local hosting. Uses OpenAI-compatible vision APIs to extract diagram structure.

## Quick Start

```bash
npm install
npm start          # Runs on http://localhost:3000
npm run dev        # Watch mode
npm test           # Run all tests
npm run build:pages # Build for GitHub Pages deployment
docker compose up --build  # Docker option
```

Environment variables: `PORT` (default 3000), `HOST` (default 127.0.0.1).

## Layout

- **`public/`** – Static HTML/CSS/JS front-end (served by `server.mjs`, deployed to GitHub Pages)
  - `app.js` – UI wiring: upload, provider/model selection, quality preset, generate/download flow
  - `svg-scene.js` – `extractSceneFromSvg()`: local SVG-to-scene conversion (bypasses AI for clean vector diagrams)
  - `chrome.js`, `index.html`, `styles.css` – page chrome and styling
- **`lib/`** – Node modules (imported by both `server.mjs` and `public/app.js`):
  - `ai-client.mjs` – OpenAI-compatible vision API client with preset providers (OpenRouter, OpenAI, custom)
  - `excalidraw.mjs` – Converts scene graph → Excalidraw `.excalidraw` JSON file
  - `scene-refiner.mjs` – Post-processes AI output for layout correctness
  - `scene-schema.mjs` – Scene graph JSON schema & validation
  - `svg-preview.mjs` – `renderSceneSvg()`: renders a scene graph back to an SVG string, for the in-browser preview (the reverse direction of `public/svg-scene.js`)
- **`tests/`** – Node test suite (5 test files covering client, parsing, scene validation, refinement, Excalidraw export)
- **`scripts/`** – `build-pages.mjs` bundles front-end code into `dist/` for GitHub Pages
- **`server.mjs`** – Minimal HTTP server with static file serving, path traversal protection, MIME type mapping
- **`.github/workflows/`** – GitHub Actions CI/CD: builds and deploys to Pages on push to default branch
- **`examples/`** – Sample diagram SVG for testing

## Conventions

- **ES modules** (`.mjs` files); no transpiler, no dependencies
- **Intermediate JSON representation**: diagram → AI prompt → scene graph (validated against schema) → Excalidraw file
- **No secrets in repo**: API keys are browser-side only; static build doesn't persist them
- **Functional style**: modules export pure functions for composability
- **Path safety**: `safeJoin()` in server prevents directory traversal attacks
- **MIME types** explicitly mapped (CSS, HTML, JS, SVG, JSON)
- **Deterministic export**: same scene graph → same Excalidraw file (useful for testing)

## Quality Presets
Two prompt-based modes:
- **`balanced`** (default) – cleaner layouts, short labels, good for most diagrams
- **`structured`** – grid-aligned, even spacing, left-to-right flow, bound connectors

## Testing

Run all tests:
```bash
npm test
```

Tests validate:
- AI client prompt building and message normalization
- Scene graph schema enforcement
- SVG-to-scene local conversion
- Scene layout refinement (spacing, overlap fixes)
- Excalidraw export correctness

## Gotchas

1. **No back-end processing** – Clients must provide their own API keys (OpenRouter or OpenAI). GitHub Pages version is fully client-side.
2. **SVG bypass** – If uploaded file is SVG, `Auto` mode tries `public/svg-scene.js`'s local conversion first; may not need an API key.
3. **Port binding** – Server logs to stdout on startup; check console for actual address if using custom PORT/HOST.
4. **Build output** – `npm run build:pages` bundles everything into `dist/`; GitHub Actions auto-deploys this on push.
5. **CORS not needed** – Vision API calls go directly from browser (user's key, user's quota).
6. **Messy diagrams** – AI quality depends on underlying model; clean SVG or vector diagrams convert locally with better results.

## Development Notes

- Models used: `openai/gpt-4.1-mini` (OpenRouter), `gpt-4.1-mini` (OpenAI), or any OpenAI-compatible endpoint
- Canvas always 1000×1000 (top-left origin) for deterministic coordinates
- Scene refiner runs heuristic layout fixes (padding, centering, overlap avoidance)
- No build step required for local development; edit `public/` files and refresh

## Deployment

**GitHub Pages**: Push to default branch → Actions workflow builds `dist/` and deploys automatically. Custom domain via `CNAME` file (set to `i2e.riera.co.uk`).

**Docker**: `compose.yml` runs `server.mjs` on port 3000 inside container.
