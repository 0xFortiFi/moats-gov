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

## Custom options for non-basic voting methods
Every voting method except `basic` votes on admin-defined custom options stored in
`proposals.options` (nullable `jsonb` `string[]`). Basic uses the fixed
for/against/abstain set and stores `options = null`.

Discriminator rule (kept identical on frontend AND backend to avoid divergence):
**a proposal is "custom" iff `options` is non-empty**, NOT `votingMethod !== 'basic'`.
Creation enforces the invariant so new non-basic proposals always carry 2–10 unique
(case-insensitive, trimmed) options; legacy non-basic rows with null options therefore
fall back to basic on both ends consistently.

**Why options must be unique:** tallies key on the exact choice string, so a duplicate
option would split/double-count and push aggregate % over 100. Enforced server-side
(`Options must be unique`) and mirrored client-side.

## Custom voting is WEIGHTED percentage allocation (not single-click)
Custom-option proposals do NOT cast one choice — voters allocate a whole-number
percentage across options that must sum to exactly 100, submit once, and sign once.
The `votes` table is a dual model: `choice` (nullable) for basic, `allocations`
(nullable `jsonb` `Record<string,number>`) for weighted. A DB CHECK constraint
`vote_choice_xor_allocations` enforces exactly one of the two is set per row.

Results for custom proposals = each option's share of total allocated weight
(`Σ allocation% / Σ all allocation%`), derived client-side; legacy single-choice
custom votes (allocations null, choice = option) count as 100% to that option.

**Signature binding for weighted votes must be EXACT, not substring.**
`messageMatchesWeightedVote` reconstructs the allocation map from the signed message
(anchored on the proposal's known options + full-line `\n<opt>: <pct>%` boundaries),
counts every `^.+: \d+%$` line to reject extras, and requires the parsed map to
deep-equal the submitted allocation.
**Why:** an earlier substring (`message.includes(...)`) check let a signature be bound
to a different allocation than what gets stored (extra/missing/overlapping lines).
**How to apply:** if the client weighted-vote message format in `proposal-detail.tsx`
changes, update this parser in lockstep or all weighted votes 400.

## Admin endpoints have NO server-side auth (app-wide)
Proposal create/update/delete and admin add/remove accept any caller — `createdBy`
is whatever the client sends; there is no session/signature gate on admin routes.
Only **votes** are signature-verified. The Admin page's "Submitted Proposals" tab
filters by `createdBy === connected wallet` purely client-side for display/UX.
**Why:** the app has no auth system tying HTTP requests to a wallet identity.
**How to apply:** any "only the owner can do X" admin feature is display-only until a
signature/session auth layer is added across ALL admin routes — don't bolt authz onto
one endpoint in isolation (inconsistent + still bypassable elsewhere).
