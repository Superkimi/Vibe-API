# Vibe API

Compose public APIs by browsing a directory or talking to an AI assistant. Vibe API keeps the API graph, output dashboard, preview data, and export formats connected through one versioned workflow Schema.

## What is included

- Manual API directory with the researched `public-apis` and `60s` sources.
- React Flow canvas for nodes, edges, parameters, mappings, and output keys.
- Right-side AI panel with OpenAI-compatible `baseUrl`, model, and API key settings.
- Deterministic local demo mode when no model key is configured.
- Schema editor, sample-data preview, undo/redo, output inspector, and auto-layout.
- Export to Vibe API JSON, OpenAPI 3.1-compatible JSON, and Skill Markdown.
- Revision-safe AI writes so stale responses cannot overwrite newer manual edits.

## Local development

```sh
npm install
npm run dev
```

Open `http://localhost:30243`. The default demo mode is local-first and does not make upstream API calls.

Optional environment variables:

```sh
NEXT_PUBLIC_BASE_PATH=
VIBE_API_BASE_URL=https://api.openai.com/v1
VIBE_API_API_KEY=
```

The in-product key is kept in the current browser tab's `sessionStorage`. It is not persisted in the workflow, exported files, or Git history. For a server-side deployment, inject `VIBE_API_API_KEY` through the runtime secret manager instead of committing it.

## Verification

```sh
npm run check
```

This runs ESLint, TypeScript checking, Vitest, and the Next.js production build.

## Schema contract

The portable format starts with `vibe-api/1` and contains:

- catalog-backed API nodes and request parameters;
- explicit edges with field mappings;
- output widgets pointing to stable node fields;
- a revision and workflow identity for safe AI edits.

The preview uses catalog sample responses. A production runtime still needs an endpoint allowlist, runtime secret injection, timeouts, retries, rate limits, and observable partial failures before it should execute real upstream requests.

## Research and licensing

Research notes and source boundaries are in [`docs/research.md`](docs/research.md). The catalog stores API metadata and source links; it does not copy upstream documentation or restricted prose into the product.
