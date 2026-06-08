# Memory Index

- [Moat governance voting](moat-governance-voting.md) — votability is time-derived not `status`; per-moat points need `contractAddress`; vote signatures bound + DB-unique to stop replay/dupes.
- [Orval codegen quirks](orval-codegen-quirks.md) — an op with BOTH a path param and a query param collides on `<Op>Params` in the api-zod barrel; use a path segment instead.
- [Drizzle push of constraints](drizzle-push-constraints.md) — `db run push` is interactive and dies adding a constraint to a non-empty table; add via SQL when data already conforms.
- [Moat logos](moat-logos.md) — how moats.app resolves per-moat logos from DexScreener.
