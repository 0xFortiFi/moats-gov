---
name: Moat logo source
description: Where verified-Moat token logos come from and why some are missing
---

# Moat logos

Verified-Moat logos are resolved on the API server, not from the Moats API (moat-config has NO logo field).

Flow (in `artifacts/api-server/src/routes/projects.ts`):
1. Call `stakingToken()` (selector `0x72f702f3`) on the moat contract via AVAX RPC (`https://api.avax.network/ext/bc/C/rpc`).
2. Query DexScreener `https://api.dexscreener.com/latest/dex/tokens/{stakingToken}`.
3. Pick `info.imageUrl` from the **highest-liquidity** pair.

**Why this source:** it's exactly what pro.moats.app itself uses (its bundle does the same `info.imageUrl` highest-liquidity pick). So our coverage matches theirs 1:1.

**Why ~7/20 have no logo:** those tokens simply have no `info.imageUrl` on DexScreener. Frontend falls back to a letter-avatar. This is expected, not a bug.

**Dead ends (don't retry from this env):** `arena.trade` API returns HTTP 000 (blocked). `cdn.dexscreener.com`/`dd.dexscreener.com` direct token-icon paths 404. TrustWallet assets pattern (`raw.githubusercontent.com/trustwallet/assets/.../avalanchec/assets/{checksumAddr}/logo.png`) is what the bundle uses for *well-known* tokens (WAVAX/USDT/etc.) but Arena meme tokens aren't in that repo.

**Network note:** RPC is hardcoded to Avalanche. Currently all 20 verified moats are on `avalanche`, so this is fine. If a non-AVAX verified moat ever appears, make `resolveMoat` network-aware (map moat-config `network` → RPC URL).
