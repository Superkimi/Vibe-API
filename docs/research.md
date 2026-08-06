# Vibe API research notes

The checked-in catalog contains 1,716 source records: 1,641 public-apis directory entries and 75 published 60s `/v2` routes. It does not copy provider implementation code or redistribute provider credentials.

## Reference repositories

- [`public-apis/public-apis`](https://github.com/public-apis/public-apis) provides a large manually curated index organized by category, with the fields that matter for discovery: name, description, authentication, HTTPS, and CORS. Vibe API mirrors every directory row as a compact result-preview card and keeps the provider link explicit because the repository is an index, not a single executable API host.
- [`vikiboss/60s`](https://github.com/vikiboss/60s) shows a practical collection of real endpoints with a stable `/v2` router, public examples, deployment notes, and an agent-skill surface. Vibe API mirrors all 75 published routes, infers request inputs from the upstream modules, and can fetch live results through a catalog-ID-only server route.

## Product patterns used

- Graph Compose documents the useful product contract: visual editing, AI generation, and code-defined workflows compile to one portable execution graph. Vibe API applies the same contract to API nodes and an exportable `vibe-api/1` schema.
- Existing Vibe Chart in this workspace contributes the schema-first approach, revision-safe AI updates, React Flow canvas, and the restrained lilac design tokens. Vibe API keeps the concepts but uses API-specific data, parameters, preview widgets, OpenAPI export, and Skill export.
- Local `pi-web` shows a useful model configuration pattern: provider endpoint, model id, API key status, and a server-side OpenAI-compatible call. Vibe API keeps the key in session storage and never writes it to workflow exports.

## Safety and quality boundaries

- The client can preview every catalog record's sample/metadata response without making arbitrary browser-side requests.
- Live preview is limited to known catalog IDs and uses the upstream definition's base URL; the user never supplies an arbitrary server-side URL, reducing SSRF risk.
- A production runner still needs a server-side credential vault, allowlisted outbound hosts, retries, timeouts, response-size limits, redaction, and per-node observability before it is used as a public execution service.
- AI edits are applied only after Zod validation and share the same revision and undo history as manual edits.

## Licenses

The reference repositories are MIT licensed. This project keeps the repository-level references and uses independently authored catalog metadata and UI code.
