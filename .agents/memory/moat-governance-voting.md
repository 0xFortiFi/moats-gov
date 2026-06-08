---
name: Moat governance voting model
description: How proposal votability, per-moat points, and vote-signature auth work
---

# Voting model

## Votability is time-derived, NOT the static `status` column
Proposals are created with `status: "pending"` and nothing auto-transitions them to
"active". So voting must be gated on the time window, not the status enum:
`isVotingOpen = status !== "cancelled" && now >= startDate && now <= endDate`.
This logic is duplicated in the backend (`votes.ts` POST) and frontend
(`proposal-detail.tsx`). The `status` badge is display-only.

**Why:** the old gate `status !== "active"` wrongly showed "Voting is Closed" for every
proposal because none were ever flipped to "active".

## Per-moat Moat Points
Voting power is the wallet's points for the SPECIFIC moat being voted on. Endpoint:
`GET https://moat-api.fortifi.network/api/moat-points/v2/user/{wallet}?contractAddress={moatContract}`
returns `{ points, ... }`. WITHOUT `contractAddress` it errors `{"message":"contractAddress required"}`.
The moat contract is the proposal's project `contractAddress`. Surfaced via
`GET /proposals/{id}/voting-power/{walletAddress}`.

## Vote signature auth (replay-resistant without a nonce table)
Client signs a plain message (wagmi `useSignMessage`) embedding choice, `proposal #{id}`,
`Wallet: {addr}`, and an ISO `Timestamp:`. Backend verifies with viem `verifyMessage`
AND re-checks the message is bound to this exact vote (`messageMatchesVote`): choice +
proposalId + wallet present, timestamp within 10 min. Without the binding check a valid
signature could be replayed for a different choice/proposal. If the client message format
changes, update `messageMatchesVote` in lockstep.

Duplicate votes are prevented by a DB unique constraint `uniq_vote_proposal_wallet`
on `(proposal_id, wallet_address)` + `onConflictDoNothing(...).returning()` (empty → 409-style 400).
App-level select-then-insert alone was racy.
