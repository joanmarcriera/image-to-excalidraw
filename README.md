# image-to-excalidraw

Turn a diagram screenshot into a downloadable `.excalidraw` file from a local web app or a GitHub Pages site.

The app now runs as a static site. It can be hosted on GitHub Pages, asks for an OpenAI-compatible vision API key directly in the browser when AI extraction is needed, and converts the result into:

- a downloadable `.excalidraw` file
- a browser SVG preview
- a normalized intermediate JSON scene for debugging
- a direct local SVG conversion path for clean vector diagrams

## What this repo includes

- a static browser app that can be deployed to GitHub Pages
- an optional tiny Node server for local static hosting
- a local browser UI for uploading an image and entering provider details
- OpenRouter and OpenAI presets
- support for other OpenAI-compatible base URLs
- auto-detection for SVG uploads, which can bypass AI entirely
- a bundled example diagram in `examples/sample-flow.svg`
- Docker support through `Dockerfile` and `compose.yml`
- a GitHub Pages workflow
- Node tests for the parsing and Excalidraw generation pipeline

## Quick start

1. Clone the repo.
2. Run:

```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000)
4. Upload a diagram image.
5. Paste a vision-capable API key.
6. Pick a model.
7. Generate and download the resulting `.excalidraw` file.

If the uploaded file is an SVG, `Auto` mode will try a local conversion first and may not need an API key at all.

## GitHub Pages

This repo can now be deployed as a static GitHub Pages site.

1. Push the repo to GitHub.
2. In repository settings, set Pages to use GitHub Actions as the source.
3. Push to your default branch.
4. The workflow in `.github/workflows/deploy-pages.yml` will build `dist/` and deploy it.

The app uses relative asset URLs, so it will work on a project Pages URL such as `https://<owner>.github.io/<repository>/`.

## Provider setup

The app expects an OpenAI-compatible chat completions endpoint with vision support.
Use Node 18+ for local scripts and tests.

Recommended presets:

- `OpenRouter`
  - Base URL: `https://openrouter.ai/api/v1`
  - Example model: `openai/gpt-4.1-mini`
- `OpenAI`
  - Base URL: `https://api.openai.com/v1`
  - Example model: `gpt-4.1-mini`

You can also choose `Custom-compatible` and supply another compatible base URL.

## Commands

```bash
npm start
npm run dev
npm run build:pages
npm test
```

Docker option:

```bash
docker compose up --build
```

## Notes

- The image and API key are only used for the active request.
- The static GitHub Pages build does not persist secrets to disk.
- The generated Excalidraw file is deterministic from the extracted scene graph.
- Clean SVG diagrams can now convert locally without any provider call.
- Very messy whiteboard photos will still depend on the underlying model quality.
- Because the GitHub Pages version is client-side, users should only paste keys they control personally.

## Why there are no extra MCP servers or vendored skills here

You asked to pull MCPs and skills if needed. I inspected the repo situation and the external skill catalog, but this runtime app does not need MCP infrastructure or third-party agent skills to work for end users. Those tools help the coding agent; they do not improve the cloned product itself. The delivered repo is therefore self-contained, with the SVG conversion fallback inspired by the references you shared.
