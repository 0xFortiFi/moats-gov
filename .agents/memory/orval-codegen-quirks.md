---
name: Orval codegen quirks (api-spec)
description: Non-obvious failures when editing lib/api-spec/openapi.yaml and running codegen
---

# Orval codegen quirks

## Path-param + query-param on the same operation → barrel name collision
If an OpenAPI operation has BOTH a path parameter and a query parameter, orval
generates a zod path-params schema named `<Op>Params` (in `lib/api-zod/src/generated/api.ts`)
AND a query type also named `<Op>Params` (in `generated/types/`). The api-zod barrel
(`lib/api-zod/src/index.ts`) does `export * from "./generated/api"` and
`export * from "./generated/types"`, so the two collide → `TS2308: already exported a member named '<Op>Params'`
and `pnpm --filter @workspace/api-spec run codegen` fails on its `typecheck:libs` step.

**Why:** operations with only path params (no query) or only query params (no path)
don't collide because the names differ (`<Op>QueryParams` vs `<Op>Params`). The clash
is unique to having both.

**How to apply:** when adding an endpoint that needs a value scoped by another value,
prefer a second path segment over a query param, e.g.
`/proposals/{id}/voting-power/{walletAddress}` instead of
`/proposals/{id}/voting-power?walletAddress=`. Avoids the collision entirely.

## Misc
- Do not change OpenAPI `info.title`; orval.config rewrites it to "Api" and generated filenames depend on it.
- Transient vite "Pre-transform error: Failed to load .../generated/api.ts" appears DURING codegen (clean step deletes then rewrites). Ignore once codegen finishes and HMR re-updates.
