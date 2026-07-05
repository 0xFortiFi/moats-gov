---
name: Moats data source quirks
description: Where moat names/logos/networks come from and why some need manual overrides
---

- Project data comes from the official Moat API (`moat-api.fortifi.network/api/moat-config`); only `status === "Verified"` entries are used. It stores no display names or logos.
- Names are resolved on-chain via Avalanche RPC (`stakingToken()` → `name()`), logos via DexScreener highest-liquidity pair. **Both only work for Avalanche moats** — moats on other networks (e.g. `thegrotto`) need entries in `NAME_OVERRIDES` / `LOGO_OVERRIDES` in the api-server projects route (keys must be lowercase contract addresses).
- The upstream `moat-points/all` endpoint uses `address` (not `walletAddress`) for wallet fields. **Why:** relying on assumed field names caused a runtime crash; the server now accepts both.
- Verified-moats results are cached in-memory for 10 minutes — restart the API Server workflow after changing overrides, or changes won't appear.
- **How to apply:** when the user supplies a logo/name for a moat, add to the override maps, restart the workflow, verify via `curl localhost:80/api/projects`.
