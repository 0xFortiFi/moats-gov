# Moats Governance — SDK & UI Template

> Deep navy `#0D1B2E` · Gold `#D4931A` · Dark-only · Zero external dependencies

This document covers both deliverables:

- **Part 1 — SDK** (`moats-governance-sdk.ts` / `sdk.js`) — TypeScript/JS API client
- **Part 2 — UI Template** (`index.html`, `styles.css`, `app.js`) — ready-to-use governance frontend

---

# Part 1 — Moats Governance SDK

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

// List all active proposals
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

// Get a single project by ID
const project = await sdk.projects.get(1);

// Create a project manually (usually auto-synced)
const created = await sdk.projects.create({
  name: "My Protocol",
  contractAddress: "0xABC...",
  description: "Optional description",
});

// Top-100 Moat Points leaderboard for a project
const leaderboard = await sdk.projects.leaderboard(1);
// Returns: [{ rank, walletAddress, points }, ...]
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
// List all proposals
const all = await sdk.proposals.list();

// Filter by status
const active = await sdk.proposals.list({ status: "active" });

// Filter by project
const byProject = await sdk.proposals.list({ projectId: 1 });

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
  votingMethod: "single_choice",
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

// Check a wallet's voting power (Moat Points balance)
const power = await sdk.votes.votingPower(proposalId, "0xYourWallet");
// Returns: { walletAddress, moatPoints, contractAddress }

// Cast a basic vote
await sdk.votes.castBasicVote(
  proposalId,
  "for",            // "for" | "against" | "abstain"
  "0xYourWallet",
  signerFn
);

// Cast a weighted vote — percentages MUST sum to exactly 100
await sdk.votes.castWeightedVote(
  proposalId,
  { "Path A": 60, "Path B": 25, "Path C": 15 },
  "0xYourWallet",
  signerFn
);
```

### Signed message format

The SDK builds these automatically. They appear in the user's wallet before signing.

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
// All Moats verified by the Moats protocol (10-minute server-side cache)
const moats = await sdk.moats.listVerified();
// Returns: [{ contractAddress, name, network, description, tags }, ...]
```

---

## Error Handling

All failed API requests throw a `MoatsApiError` with a typed `status` (HTTP code) and `body`.

```ts
import { MoatsGovernanceSDK, MoatsApiError } from "./moats-governance-sdk";

try {
  await sdk.votes.castBasicVote(proposalId, "for", wallet, signer);
} catch (err) {
  if (err instanceof MoatsApiError) {
    console.error(err.status, err.message);
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

```ts
import type {
  Project, CreateProjectInput, LeaderboardEntry,
  Proposal, CreateProposalInput, UpdateProposalInput,
  ProposalStatus, ProposalSummary,
  Vote, VotingPower,
  Admin, AddAdminInput,
  VerifiedMoat,
  BasicChoice, VotingMethod, QuorumType,
  SignerFn, MoatsGovernanceSDKConfig,
} from "./moats-governance-sdk";
```

---

## Reference Tables

### Proposal Status

| Status | Description |
|--------|-------------|
| `pending` | Created but start date not yet reached |
| `active` | Voting is open |
| `passed` | Voting closed, quorum met |
| `failed` | Voting closed, quorum not met |
| `cancelled` | Soft-deleted |

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
| `participation` | FOR + AGAINST + ABSTAIN all count |
| `approval` | Only FOR votes count |
| `for_abstain` | FOR + ABSTAIN count |
| `percentage` | % of total eligible voting power |
| `fixed_token` | Fixed token-amount threshold |
| `dual` | Participation + approval minimums, both required |
| `veto` | Passes unless opposition reaches threshold |
| `dynamic` | Adjusts based on historical participation |
| `time_weighted` | Quorum decreases over the voting window |
| `tiered` | Different levels per proposal type |
| `security` | Elevated requirements for sensitive changes |

---

---

# Part 2 — Moats Governance UI Template

A ready-to-use frontend template for building Moats-powered governance interfaces.
Dark-only brand design, zero build step, fully wired to the Moats Governance SDK.

---

## What's Included

```
moats-governance-ui-template/
├── index.html    — Single-page app shell (all views and markup)
├── styles.css    — Full Moats dark theme (navy, gold, responsive)
├── sdk.js        — Browser-ready Moats Governance SDK (ES module)
├── app.js        — All UI logic wired to the SDK
└── README.md     — Quick-start guide
```

No npm, no Webpack, no build step. Opens in any modern browser.

---

## Quick Start

**Step 1 — Serve the files locally**

ES modules require a server (not a `file://` URL):

```bash
# Python (built-in)
python3 -m http.server 3000

# Node.js
npx serve .

# VS Code — Install "Live Server" → right-click index.html → "Open with Live Server"
```

**Step 2 — Open in your browser**

```
http://localhost:3000
```

**Step 3 — Connect to your API**

Enter your deployed Moats Governance API URL in the bar at the top:

```
https://your-app.replit.app
```

Click **Connect** — all views load live data immediately.

**Step 4 — Connect your wallet**

Click **Connect Wallet** in the header. MetaMask or any `window.ethereum` wallet works out of the box.

---

## Screens & Features

### Dashboard

- Live summary stats — Total, Active, Passed, and Pending proposal counts
- Five most recent proposals with status badges and click-through to the detail view

### Projects

- Browsable grid of all governance projects
- Click any card to open a modal with the project's proposals and a top-20 Moat Points leaderboard

### Proposals

- Filter tabs — All / Active / Pending / Passed / Failed
- **Create Proposal** modal — title, description, voting method, quorum, custom options, date pickers
- Click any card to open the full Proposal Detail view

### Proposal Detail

| Section | Content |
|---------|---------|
| Header | Title, status badge, project, dates, voting method, quorum info |
| Description | Full proposal text |
| Current Results | Live progress bars — FOR/AGAINST/ABSTAIN (basic) or per-option share (weighted) |
| Voting Panel | Wallet-gated vote UI (see states below) |
| Votes Table | All cast votes: voter, choice/allocation, Moat Points, timestamp |

**Voting panel states:**

| State | What the user sees |
|-------|--------------------|
| Voting closed | "Voting Closed" message |
| No wallet | Prompt with Connect Wallet button |
| Already voted | Green confirmation tick |
| Basic proposal, open | FOR / AGAINST / ABSTAIN buttons → sign & submit |
| Weighted proposal, open | Percentage inputs per option (must total 100%) → sign & submit |

### Verified Moats

- Grid of all Moats-verified protocols with name, description, network, contract address, and tags

---

## Connecting a Wallet

The template uses `window.ethereum` by default. To use a different library, replace `makeSigner()` in `app.js`:

```js
// wagmi / viem
function makeSigner() {
  return (msg) => signMessageAsync({ message: msg });
}

// ethers v6
async function makeSigner() {
  const signer = await provider.getSigner();
  return (msg) => signer.signMessage(msg);
}

// WalletConnect
function makeSigner() {
  return (msg) => wcProvider.request({
    method: "personal_sign",
    params: [msg, walletAddress],
  });
}
```

---

## Customisation

### Change the colour scheme

All tokens are CSS variables at the top of `styles.css`:

```css
:root {
  --navy:      #0D1B2E;   /* page and card background */
  --gold:      #D4931A;   /* primary accent / CTA     */
  --text:      #E8EDF4;   /* body text                */
  --muted:     #7A8BA3;   /* secondary / label text   */
}
```

### Add a new view

1. Add to `index.html`:
```html
<div class="view" id="view-analytics">
  <div class="section-header"><h1>Analytics</h1></div>
</div>
```

2. Add a nav button:
```html
<button class="nav-btn" data-view="analytics">Analytics</button>
```

3. Add to `app.js`:
```js
// Inside the loaders map in loadCurrentView():
analytics: loadAnalytics,

// Then define:
async function loadAnalytics() {
  const proposals = await sdk.proposals.list();
  // build your content here
}
```

### Common CSS utility classes

| Class | Purpose |
|-------|---------|
| `.card` | Standard card container |
| `.grid-2` | 2-column responsive grid |
| `.grid-4` | 4-column stat grid |
| `.btn .btn-primary` | Gold CTA button |
| `.btn .btn-outline` | Bordered ghost button |
| `.badge .badge-active` | Status badge |
| `.stat-card` | Dashboard metric tile |
| `.empty` | Centred empty-state block |
| `.loading` | Spinner + "Loading…" row |

---

## Bundling for Production

The template is plain ES modules — it drops straight into any bundler.

### Vite

```bash
npm create vite@latest my-governance-app -- --template vanilla
# Copy index.html, styles.css, sdk.js, app.js into the project
npm run build
```

### React / Next.js

Import `sdk.js` as a utility and rewrite `app.js` logic as React components.
The SDK has no browser-only dependencies and works in SSR contexts with a custom `fetch`.

---

## File Reference

| File | Description |
|------|-------------|
| `index.html` | Pure HTML markup — no inline scripts or styles. One `<div class="view">` per screen. |
| `styles.css` | ~600 lines of component CSS — reset, tokens, layout, cards, badges, buttons, forms, vote panel, modals, toasts, responsive breakpoints. |
| `sdk.js` | Browser ES module — TypeScript annotations stripped from `moats-governance-sdk.ts`. Exports `MoatsGovernanceSDK` and `MoatsApiError`. |
| `app.js` | ~450 lines of vanilla JS — config, wallet, navigation, all screen loaders, modals, vote wiring, toast notifications, bootstrap. |
