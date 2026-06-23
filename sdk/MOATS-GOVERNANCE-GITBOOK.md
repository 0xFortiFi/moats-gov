# Moats Governance — Documentation

> **On-chain governance, powered by Moat Points.**
> Built for protocols that want decentralised, community-led decision making.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Core Concepts](#2-core-concepts)
3. [How Governance Works](#3-how-governance-works)
4. [Proposals](#4-proposals)
5. [Voting](#5-voting)
6. [Quorum](#6-quorum)
7. [Moat Points & Voting Power](#7-moat-points--voting-power)
8. [Roles & Permissions](#8-roles--permissions)
9. [Proposal Lifecycle](#9-proposal-lifecycle)
10. [Integrating with the SDK](#10-integrating-with-the-sdk)
11. [Glossary](#11-glossary)

---

## 1. Introduction

Moats Governance is a on-chain governance layer built on top of the **Moats protocol** — a system that rewards community members for their contributions to decentralised ecosystems through **Moat Points**.

Rather than using raw token balances to determine voting power (which can concentrate control in the hands of wealthy wallets), Moats Governance uses **Moat Points** — a reputation metric that reflects genuine, sustained participation within a protocol's community.

### What can it do?

- Allow community members to **propose** protocol changes, funding decisions, and operational upgrades.
- Weight votes by **Moat Points**, not raw token holdings.
- Support both **simple** (FOR/AGAINST/ABSTAIN) and **complex** (weighted allocation, ranked, quadratic) voting.
- Track governance activity across **multiple projects** under one deployment.
- Require **wallet signatures** for every vote — no gas, no on-chain transactions required.

> **Key insight:** A wallet with 10,000 Moat Points has more influence than one holding 1,000,000 tokens but zero on-chain participation history. This incentivises genuine contribution over capital accumulation.

---

## 2. Core Concepts

Understanding Moats Governance requires familiarity with five building blocks:

---

### Projects

A **Project** represents a protocol or organisation that has been verified by the Moats network. Each project has:

- A name and description
- A **contract address** — the on-chain identity of the Moat
- A set of **Proposals** created by its admins
- A **Leaderboard** of top Moat Points holders

Projects are auto-synced from the Moats protocol when they reach verified status.

---

### Moat Points

**Moat Points** are a non-transferable reputation score assigned by the Moats protocol to wallets that participate meaningfully in a project's ecosystem.

- Points are **not tokens** — they cannot be bought, sold, or transferred.
- They are calculated by the Moats protocol based on on-chain activity.
- Each wallet's Moat Points are **project-specific** — your score on Protocol A does not affect your weight on Protocol B.
- Voting power in a proposal equals a wallet's Moat Points balance **at the time the proposal was created**.

> **Why this matters:** Governance cannot be captured by buying tokens. Influence must be earned through genuine participation.

---

### Proposals

A **Proposal** is a formal request for the community to make a decision. It contains:

| Field | Description |
|-------|-------------|
| Title | Short, clear statement of what is being decided |
| Description | Full rationale, background, and implications |
| Voting Method | How votes are structured (basic, weighted, ranked, etc.) |
| Quorum | The participation threshold that must be met for the vote to be valid |
| Start Date | When voting opens |
| End Date | When voting closes |
| Options | (For custom proposals) The choices voters allocate between |
| Status | `pending` → `active` → `passed` / `failed` |

---

### Votes

A **Vote** is a signed message from a wallet expressing a preference on a proposal. Votes are:

- **Off-chain** — no gas cost, no blockchain transaction.
- **Verified** — every vote requires a valid `personal_sign` signature from the voter's wallet.
- **Weighted** — the vote's influence is proportional to the voter's Moat Points.
- **Final** — once cast, a vote cannot be changed.

---

### Admins

**Admins** are wallets granted permission to manage proposals for a specific project. They can create, edit, and delete proposals. Admins are assigned per-project by the protocol owner.

The protocol **Owner** manages the admin list from a separate, URL-only accessible panel.

---

## 3. How Governance Works

At a high level, the governance flow is:

```
Protocol earns Moat verification
        ↓
Project is created in the Governance app
        ↓
Admin creates a Proposal
        ↓
Community members review and cast Votes
        ↓
Quorum is evaluated at proposal close
        ↓
Proposal is marked Passed or Failed
        ↓
Community acts on the outcome
```

Each step is covered in detail in the sections below.

---

## 4. Proposals

### Creating a Proposal

Only wallets with **Admin** status for a project can create proposals. Through the governance UI or directly via the SDK:

1. Select the project the proposal belongs to.
2. Write a clear **title** and detailed **description**.
3. Choose a **voting method** (see [Voting Methods](#voting-methods)).
4. Set a **quorum type and threshold** (see [Quorum](#6-quorum)).
5. (For weighted proposals) Define the **options** community members will allocate between.
6. Set a **start date** and **end date** for the voting window.

> **Best practice:** Allow at least 72 hours of voting time. For major protocol decisions, a 7-day window is standard. Post the proposal description in your community channels before the voting window opens.

### Editing a Proposal

Admins can edit a proposal's title, description, end date, or status **while it is pending**. Once a proposal is `active` (i.e. the start date has passed and votes exist), it should not be edited.

### Cancelling a Proposal

Admins can soft-delete a proposal at any time by setting its status to `cancelled`. Cancelled proposals remain visible for transparency but voting is disabled.

---

## 5. Voting

### Voting Methods

Moats Governance supports six voting methods. The method is chosen when the proposal is created and cannot be changed.

---

#### Basic (FOR / AGAINST / ABSTAIN)

The simplest vote type. Each voter picks exactly one of three options.

```
✓ FOR       — I support this proposal
✗ AGAINST   — I oppose this proposal
◎ ABSTAIN   — I acknowledge the proposal but take no stance
```

Use this for binary decisions: yes/no upgrades, funding approvals, policy changes.

**Results:** Displayed as percentage bars. A proposal passes when FOR votes meet the quorum threshold.

---

#### Single Choice

Voters pick **exactly one** option from a custom list. Useful for elections, selecting between mutually exclusive paths, or choosing a partner protocol.

```
○ Option A
○ Option B
● Option C   ← selected
```

---

#### Weighted

Voters **distribute 100%** of their influence across options in any proportion. This is ideal for budget allocation, risk weighting, or any decision where nuance matters.

```
Option A  [████████░░]  60%
Option B  [████░░░░░░]  25%
Option C  [███░░░░░░░]  15%
                       ───
Total:                 100%  ✓
```

The wallet signs a single message listing all allocations. The weighted influence of each option is then scaled by the voter's Moat Points.

---

#### Approval Voting

Voters select **one or more** acceptable options. Every selected option receives the voter's full Moat Points weight. Use when multiple outcomes are acceptable and you want to find the broadest consensus.

---

#### Ranked Choice

Voters rank all options in order of preference. The option with the fewest first-preference votes is eliminated, and those votes are redistributed until one option has a majority.

---

#### Quadratic

The cost of votes increases quadratically. A voter with 100 Moat Points can cast:
- 10 votes at a cost of 1 point each, or
- 1 vote at a cost of 1 point, but
- casting 10 votes costs 100 points (10²)

This limits the outsized influence of top point-holders and amplifies the signal of smaller, engaged community members.

---

### How Signing Works

Every vote — regardless of method — requires a **wallet signature**. This proves the voter controls the wallet without requiring an on-chain transaction or gas payment.

The governance app and SDK build a human-readable message that is shown to the voter inside their wallet before they sign:

**Basic vote message:**
```
Moats App Governance

Confirm vote "FOR" on proposal #42 (Should we increase staking rewards?).

Wallet: 0xAbc123...
Timestamp: 2025-06-22T14:30:00.000Z
```

**Weighted vote message:**
```
Moats App Governance

Confirm weighted vote on proposal #42 (Q3 Treasury Allocation).

Infrastructure: 50%
Grants: 30%
Marketing: 20%

Wallet: 0xAbc123...
Timestamp: 2025-06-22T14:30:00.000Z
```

The server verifies the signature matches the stated wallet address before recording the vote. A mismatched or replayed signature is rejected.

> **Security note:** Signatures are timestamped and proposal-specific. A signature from one proposal cannot be replayed on another.

---

### Voting Rules

| Rule | Detail |
|------|--------|
| One vote per wallet | Each wallet can vote once per proposal |
| No vote changes | Votes are final once submitted |
| Voting window | Votes are only accepted between `startDate` and `endDate` |
| Signature required | Every vote must carry a valid wallet signature |
| Weighted totals | Weighted allocations must sum to exactly 100% |

---

## 6. Quorum

Quorum is the minimum participation threshold that must be met for a proposal's result to be considered valid. If quorum is not reached by the end date, the proposal is marked **Failed** regardless of the vote distribution.

### Quorum Types

---

#### Participation Quorum
The most common type. Quorum is reached when the combined weight of **all votes** (FOR + AGAINST + ABSTAIN) exceeds the threshold.

```
Threshold: 10%
Total eligible voting power: 500,000 points

Quorum reached when:
  Total votes cast ≥ 50,000 points
```

---

#### Approval Quorum
Only **FOR** votes count toward quorum. This is stricter — the proposal must attract active support, not just participation.

---

#### FOR + ABSTAIN Quorum
FOR and ABSTAIN votes count. AGAINST votes do not. Useful when abstention signals informed awareness rather than opposition.

---

#### Percentage Quorum
Quorum is expressed as a percentage of the **total eligible voting power** (all wallets with Moat Points for the project), rather than just votes cast.

---

#### Fixed Token Quorum
Quorum is reached when a fixed number of Moat Points have been cast. Absolute thresholds work well for smaller communities.

---

#### Dual Quorum
Two thresholds must both be met — a participation minimum **and** an approval minimum. Used for high-stakes decisions.

---

#### Veto Quorum
The proposal passes by default unless opposition reaches the threshold. Useful for routine protocol maintenance that should only be blocked if there is significant resistance.

---

#### Dynamic Quorum
The threshold adjusts based on historical participation rates. Prevents governance paralysis in low-turnout periods.

---

#### Time-Weighted Quorum
Quorum requirements decrease as the proposal approaches its end date, encouraging timely voting while remaining attainable.

---

#### Tiered Quorum
Different thresholds apply based on the proposal category (e.g. treasury changes require higher quorum than advisory signals).

---

#### Security Quorum
The highest bar. Reserved for critical protocol changes — contract upgrades, emergency pauses, or changes to the governance system itself.

---

## 7. Moat Points & Voting Power

### What are Moat Points?

Moat Points are calculated by the Moats protocol based on a wallet's verifiable on-chain activity within a project's ecosystem. The exact formula is protocol-specific, but common inputs include:

- Transaction frequency and volume
- Liquidity provision
- Smart contract interactions
- Duration of participation (time-weighted)
- Protocol-specific contribution signals

### How does voting power work?

When a wallet votes on a proposal, the server checks the voter's **current Moat Points balance** for the project's contract address. This balance is used as the weight of their vote.

```
Wallet A: 5,000 Moat Points  →  5,000 weight
Wallet B:   800 Moat Points  →    800 weight
Wallet C:    50 Moat Points  →     50 weight
```

> **Note:** Moat Points balances are live — they reflect the wallet's current standing with the Moats protocol. A wallet that earns more points between a proposal's creation and the vote cast will have proportionally more influence.

### Checking Voting Power

The SDK provides a direct method to check a wallet's current voting power on any proposal:

```ts
const power = await sdk.votes.votingPower(proposalId, "0xYourWallet");
// { walletAddress: "0x...", moatPoints: 4200, contractAddress: "0x..." }
```

This is displayed in the governance UI before a user casts their vote.

---

## 8. Roles & Permissions

Moats Governance has three distinct roles:

---

### Community Member

**Any wallet** with a Moat Points balance for a verified project.

**Can:**
- View all proposals and voting results
- Cast votes on active proposals (within the voting window)
- View the leaderboard and governance history

**Cannot:**
- Create or edit proposals
- Manage admins

---

### Admin

A wallet **explicitly granted admin status** for a specific project by the owner.

**Can:**
- Create proposals for their assigned project
- Edit proposals they created (while in `pending` status)
- Cancel proposals they created

**Cannot:**
- Edit proposals created by other admins
- Manage admin roles
- Delete the project

> Admins are assigned **per-project**. An admin for Project A has no elevated permissions on Project B.

---

### Owner

The top-level operator of the governance deployment. The owner panel is accessible only by direct URL — there is no navigation link to it.

**Can:**
- Grant and revoke admin status for any project
- Manage the full admin roster across all projects
- Access the `/owner` panel

**Note:** The Owner role is separate from the on-chain Moats protocol admin. It controls only the governance application itself.

---

## 9. Proposal Lifecycle

Every proposal moves through a defined set of states:

```
         Create
           ↓
       [ PENDING ]
    (awaiting start date)
           ↓
        Start Date
           ↓
        [ ACTIVE ]
      (voting open)
           ↓
         End Date
           ↓
    Quorum met?
    ┌────────────────────┐
   Yes                  No
    ↓                    ↓
[ PASSED ]           [ FAILED ]

              OR

         Admin action
              ↓
         [ CANCELLED ]
      (at any point)
```

### State Descriptions

| State | Voting | Editable | Visible |
|-------|--------|----------|---------|
| `pending` | Closed | Yes (by creator) | Yes |
| `active` | Open | No | Yes |
| `passed` | Closed | No | Yes |
| `failed` | Closed | No | Yes |
| `cancelled` | Closed | No | Yes |

---

## 10. Integrating with the SDK

The Moats Governance SDK is a single-file TypeScript/JavaScript library with no external dependencies. It covers the full API surface.

### Install

Copy `moats-governance-sdk.ts` into your project (TypeScript), or `sdk.js` for browser/vanilla JS.

### Initialise

```ts
import { MoatsGovernanceSDK } from "./moats-governance-sdk";

const sdk = new MoatsGovernanceSDK({
  baseUrl: "https://your-governance-app.replit.app",
});
```

### Typical integration flow

```ts
// 1. Fetch active proposals for your project
const proposals = await sdk.proposals.list({
  status: "active",
  projectId: YOUR_PROJECT_ID,
});

// 2. Let user select a proposal and check their voting power
const power = await sdk.votes.votingPower(proposalId, userWallet);
console.log(`Your voting power: ${power.moatPoints} points`);

// 3. Cast a vote (basic)
const signer = (msg) => window.ethereum.request({
  method: "personal_sign",
  params: [msg, userWallet],
});

await sdk.votes.castBasicVote(proposalId, "for", userWallet, signer);

// 4. Or cast a weighted vote (custom proposals)
await sdk.votes.castWeightedVote(
  proposalId,
  { "Infrastructure": 50, "Grants": 30, "Marketing": 20 },
  userWallet,
  signer
);
```

### Error handling

```ts
import { MoatsApiError } from "./moats-governance-sdk";

try {
  await sdk.votes.castBasicVote(proposalId, "for", wallet, signer);
} catch (err) {
  if (err instanceof MoatsApiError) {
    // err.status — HTTP status code
    // err.message — human-readable error
    if (err.status === 400 && err.message.includes("Already voted")) {
      // Handle duplicate vote
    }
  }
}
```

### Using the UI Template

For teams that want a complete, branded governance frontend with no build step, the **UI Template** provides a ready-made single-page app that uses the SDK. Unzip, serve over a local server, and point it at your API.

See the UI Template README for full customisation instructions.

---

## 11. Glossary

| Term | Definition |
|------|------------|
| **Moat** | A verified protocol or organisation in the Moats ecosystem |
| **Moat Points** | Non-transferable reputation score earned through on-chain participation |
| **Proposal** | A formal governance decision submitted for community vote |
| **Quorum** | The minimum participation threshold for a vote to be valid |
| **Basic Vote** | A vote with three fixed options: FOR, AGAINST, ABSTAIN |
| **Weighted Vote** | A vote where the voter allocates percentages across custom options |
| **Voting Power** | A wallet's Moat Points balance at the time of voting |
| **Signature** | A cryptographic proof from the voter's wallet confirming their vote |
| **Admin** | A wallet permitted to create and manage proposals for a project |
| **Owner** | The top-level operator of the governance deployment |
| **Pending** | Proposal created but voting window has not opened |
| **Active** | Proposal with an open voting window |
| **Passed** | Proposal that met quorum and closed |
| **Failed** | Proposal that did not meet quorum and closed |
| **Cancelled** | Proposal that was soft-deleted by an admin |
| **personal_sign** | The EIP-191 wallet signing method used to verify votes |
| **Off-chain** | Actions that do not require blockchain transactions (no gas) |

---

*Moats Governance — decentralised decisions, earned influence.*
