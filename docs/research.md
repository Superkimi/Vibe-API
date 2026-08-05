# Vibe API research notes

The first catalog is intentionally metadata-only. It does not copy provider implementation code or redistribute provider credentials.

## Reference repositories

- [`public-apis/public-apis`](https://github.com/public-apis/public-apis) provides a large manually curated index organized by category, with the fields that matter for discovery: name, description, authentication, HTTPS, and CORS. Vibe API turns that discovery pattern into searchable cards and typed node metadata.
- [`vikiboss/60s`](https://github.com/vikiboss/60s) shows a practical collection of real endpoints with a stable `/v2` router, public examples, deployment notes, and an agent-skill surface. Vibe API seeds a few 60s endpoints as examples and keeps source URLs visible in the catalog.

## Product patterns used

- Graph Compose documents the useful product contract: visual editing, AI generation, and code-defined workflows compile to one portable execution graph. Vibe API applies the same contract to API nodes and an exportable `vibe-api/1` schema.
- Existing Vibe Chart in this workspace contributes the schema-first approach, revision-safe AI updates, React Flow canvas, and the restrained lilac design tokens. Vibe API keeps the concepts but uses API-specific data, parameters, preview widgets, OpenAPI export, and Skill export.
- Local `pi-web` shows a useful model configuration pattern: provider endpoint, model id, API key status, and a server-side OpenAI-compatible call. Vibe API keeps the key in session storage and never writes it to workflow exports.

## Safety and quality boundaries

- The client can preview curated sample responses without making arbitrary browser-side requests.
- A production runner still needs a server-side credential vault, allowlisted outbound hosts, retries, timeouts, response-size limits, redaction, and per-node observability before it is used as a public execution service.
- AI edits are applied only after Zod validation and share the same revision and undo history as manual edits.

## Licenses

The reference repositories are MIT licensed. This project keeps the repository-level references and uses independently authored catalog metadata and UI code.
