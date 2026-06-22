# Moats Governance SDK

A standalone TypeScript / JavaScript SDK for integrating with the **Moats App Governance** API.
Drop a single file into any JS or TS project — no npm install, no bundler required.

---

## Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Projects](#projects)
- [Proposals](#proposals)
- [Votes](#votes)
- [Admins](#admins)
- [Verified Moats](#verified-moats)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)
- [Reference Tables](#reference-tables)

---

## Installation

Copy `moats-governance-sdk.ts` into your project. No package manager step needed.

```
your-project/
└── src/
    └── moats-governance-sdk.ts   ← paste here
```

For plain JavaScript projects, use the pre-compiled `sdk.js` included in the UI template zip.

---

## Quick Start

```ts
import { MoatsGovernanceSDK } from "./moats-governance-sdk";

const sdk = new MoatsGovernanceSDK({
  baseUrl: "https://your-app.replit.app",
});

// List all proposals
const proposals = await sdk.proposals.list({ status: "active" });

// Cast a vote (requires a wallet signer)
await sdk.votes.castBasicVote(
  proposalId,
  "for",
  "0xYourWalletAddress",
  (msg) => window.ethereum.request({ method: "personal_sign", params: [msg, walletAddress] })
);
```

---

## Configuration

```ts
const sdk = new MoatsGovernanceSDK({
  // Required — your deployed Moats Governance instance URL (no trailing slash)
  baseUrl: "https://your-app.replit.app",

  // Optional — provide a custom fetch implementation (Node.js, testing, etc.)
  fetch: customFetchFn,
});
```

### Using in Node.js

```ts
import nodeFetch from "node-fetch";
import { MoatsGovernanceSDK } from "./moats-governance-sdk";

const sdk = new MoatsGovernanceSDK({
  baseUrl: "https://your-app.replit.app",
  fetch: nodeFetch as unknown as typeof fetch,
});
```

---

## Projects

Projects represent protocols or organisations governed by Moat Points. They are usually auto-synced from the Moats protocol.

```ts
// List all governance projects
const projects = await sdk.projects.list();
// Returns: Project[]

// Get a single project by ID
const project = await sdk.projects.get(1);
// Returns: Project

// Create a project manually (usually auto-synced)
const created = await sdk.projects.create({
  name: "My Protocol",
  contractAddress: "0xABC...",
  description: "Optional description",
});

// Top-100 Moat Points leaderboard for a project
const leaderboard = await sdk.projects.leaderboard(1);
// Returns: LeaderboardEntry[]  [{ rank, walletAddress, points }]
```

### Project object

```ts
type Project = {
  id: number;
  name: string;
  contractAddress: string;
  description?: string;
  totalProposals?: number;
  activeProposals?: number;
  createdAt: string; // ISO 8601
};
```

---

## Proposals

Proposals are the core governance primitive. They support basic (FOR/AGAINST/ABSTAIN) and custom weighted voting.

```ts
// List all proposals (no filter)
const all = await sdk.proposals.list();

// Filter by status
const active = await sdk.proposals.list({ status: "active" });

// Filter by project
const byProject = await sdk.proposals.list({ projectId: 1 });

// Combine filters
const filtered = await sdk.proposals.list({ status: "pending", projectId: 2 });

// Aggregate counts across all proposals
const summary = await sdk.proposals.summary();
// Returns: { total, active, passed, failed, pending, cancelled }

// Get a single proposal
const proposal = await sdk.proposals.get(42);
```

### Creating proposals

**Basic proposal** (FOR / AGAINST / ABSTAIN):

```ts
const proposal = await sdk.proposals.create({
  title: "Should we increase staking rewards?",
  description: "Detailed rationale goes here.",
  projectId: 1,
  votingMethod: "basic",
  quorumType: "participation",
  quorumThreshold: 10,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 864e5).toISOString(),
  createdBy: "0xYourWallet",
});
```

**Custom proposal** (weighted / single choice / ranked):

```ts
const proposal = await sdk.proposals.create({
  title: "Which protocol upgrade should we prioritise?",
  description: "Select the path forward.",
  projectId: 1,
  votingMethod: "single_choice",        // or "weighted", "approval_voting", etc.
  options: ["Path A", "Path B", "Path C"],
  quorumType: "participation",
  quorumThreshold: 10,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 864e5).toISOString(),
  createdBy: "0xYourWallet",
});
```

### Updating and deleting

```ts
// Update a proposal (admin only)
await sdk.proposals.update(42, {
  title: "Updated title",
  endDate: new Date(Date.now() + 14 * 864e5).toISOString(),
  status: "active",
});

// Soft-delete / cancel a proposal
await sdk.proposals.delete(42);
```

---

## Votes

The SDK handles building the canonical signed message, calling your wallet signer, and submitting — all in one call.

### Compatible wallet signers

```ts
// MetaMask / any window.ethereum wallet
const signer = (msg: string) =>
  window.ethereum.request({ method: "personal_sign", params: [msg, walletAddress] });

// wagmi / viem
const signer = (msg: string) => signMessageAsync({ message: msg });

// ethers v6
const signer = (msg: string) => walletSigner.signMessage(msg);
```

### Casting votes

```ts
// List all votes on a proposal
const votes = await sdk.votes.list(proposalId);
// Returns: Vote[]

// Check a wallet's voting power (Moat Points balance)
const power = await sdk.votes.votingPower(proposalId, "0xYourWallet");
// Returns: { walletAddress, moatPoints, contractAddress }

// Cast a basic vote
const vote = await sdk.votes.castBasicVote(
  proposalId,
  "for",          // "for" | "against" | "abstain"
  "0xYourWallet",
  signerFn
);

// Cast a weighted vote (custom proposals only)
// Percentages MUST sum to exactly 100
const vote = await sdk.votes.castWeightedVote(
  proposalId,
  { "Path A": 60, "Path B": 25, "Path C": 15 },
  "0xYourWallet",
  signerFn
);
```

### Signed message format

The SDK builds these messages automatically. They are displayed to the user in their wallet before signing.

**Basic vote:**
```
Moats App Governance

Confirm vote "FOR" on proposal #42 (Proposal title here).

Wallet: 0xYourWallet
Timestamp: 2025-01-15T12:00:00.000Z
```

**Weighted vote:**
```
Moats App Governance

Confirm weighted vote on proposal #42 (Proposal title here).

Path A: 60%
Path B: 25%
Path C: 15%

Wallet: 0xYourWallet
Timestamp: 2025-01-15T12:00:00.000Z
```

---

## Admins

Admins can create, edit, and delete proposals for their assigned project.

```ts
// List all admins
const admins = await sdk.admins.list();

// Filter by project
const projectAdmins = await sdk.admins.list({ projectId: 1 });

// Grant admin rights to a wallet
const admin = await sdk.admins.add({
  walletAddress: "0xNewAdmin",
  projectId: 1,
});

// Revoke an admin
await sdk.admins.remove(admin.id);
```

---

## Verified Moats

```ts
// List all Moats verified by the Moats protocol (10-minute server-side cache)
const moats = await sdk.moats.listVerified();

// Returns:
// [
//   { contractAddress, name, network, description, tags },
//   ...
// ]
```

---

## Error Handling

All failed API requests throw a `MoatsApiError` with a typed `status` (HTTP status code) and `body` (raw server response).

```ts
import { MoatsGovernanceSDK, MoatsApiError } from "./moats-governance-sdk";

try {
  await sdk.votes.castBasicVote(proposalId, "for", wallet, signer);
} catch (err) {
  if (err instanceof MoatsApiError) {
    console.error(err.status, err.message);
    // Common errors:
    // 400  "Voting is closed for this proposal"
    // 400  "Already voted on this proposal"
    // 400  "Allocations must sum to 100"
    // 401  "Invalid wallet signature"
    // 404  "Proposal not found"
  }
}
```

---

## TypeScript Types

All types are exported directly from the SDK file:

```ts
import type {
  // Resources
  Project,
  CreateProjectInput,
  LeaderboardEntry,

  Proposal,
  CreateProposalInput,
  UpdateProposalInput,
  ProposalStatus,
  ProposalSummary,

  Vote,
  VotingPower,

  Admin,
  AddAdminInput,

  VerifiedMoat,

  // Enums
  BasicChoice,       // "for" | "against" | "abstain"
  VotingMethod,      // "basic" | "single_choice" | "weighted" | ...
  QuorumType,        // "participation" | "approval" | "percentage" | ...

  // SDK
  SignerFn,
  MoatsGovernanceSDKConfig,
} from "./moats-governance-sdk";
```

---

## Reference Tables

### Proposal Status

| Status | Description |
|--------|-------------|
| `pending` | Created but the start date has not been reached |
| `active` | Voting is open |
| `passed` | Voting closed and quorum was met |
| `failed` | Voting closed but quorum was not met |
| `cancelled` | Proposal was soft-deleted |

### Voting Methods

| Value | Description |
|-------|-------------|
| `basic` | Standard FOR / AGAINST / ABSTAIN |
| `single_choice` | Voters pick exactly one option |
| `approval_voting` | Voters select one or more valid options |
| `ranked_choice` | Voters rank all options |
| `weighted` | Voters distribute 100% across options |
| `quadratic` | Vote cost increases quadratically |

### Quorum Types

| Value | Description |
|-------|-------------|
| `participation` | FOR + AGAINST + ABSTAIN all count toward quorum |
| `approval` | Only FOR votes count |
| `for_abstain` | FOR + ABSTAIN count |
| `percentage` | Percentage of total eligible voting power |
| `fixed_token` | Fixed token-amount threshold |
| `dual` | Participation + approval minimums must both be met |
| `veto` | Passes unless opposition reaches the threshold |
| `dynamic` | Adjusts based on historical participation |
| `time_weighted` | Quorum decreases over the voting window |
| `tiered` | Different levels per proposal type |
| `security` | Elevated requirements for sensitive changes |
