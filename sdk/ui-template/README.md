# Moats Governance — UI Template

A ready-to-use frontend template for the Moats Governance SDK.
Dark-only, brand-accurate (deep navy + gold), zero build step.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page app shell — all views and markup |
| `styles.css` | Full Moats dark theme (navy, gold, responsive) |
| `sdk.js` | Browser-ready Moats Governance SDK (ES module) |
| `app.js` | UI logic wiring the SDK to every screen |

## Quick Start

1. Copy the four files into a folder (e.g. `public/` in your project).
2. Open `index.html` in a browser **via a local server** (required for ES modules):

```bash
# Python
python3 -m http.server 3000

# Node (npx)
npx serve .

# VS Code
# Install "Live Server" extension and click "Go Live"
```

3. Enter your Moats Governance API base URL in the **API URL** bar at the top, e.g.:

```
https://your-app.replit.app
```

4. Click **Connect Wallet** to use MetaMask (or any `window.ethereum` wallet) for voting.

---

## What's Included

### Dashboard
- Live summary stats: total / active / passed / pending proposals
- Recent proposals list with status badges

### Projects
- Grid of all governance projects (auto-synced from verified Moats)
- Click any card to open a modal with proposals and a top-20 leaderboard

### Proposals
- Filterable list (All / Active / Pending / Passed / Failed)
- **Create Proposal** modal — title, description, voting method, quorum, options, dates
- Click any card to open the full detail view

### Proposal Detail
- Title, description, metadata, quorum info
- **Live results** — progress bars for FOR/AGAINST/ABSTAIN (basic) or per-option share (weighted)
- **Voting panel** — wallet-connected users can cast a basic or weighted vote with one click and a wallet signature
- Full votes table

### Verified Moats
- All protocol-verified Moats with network, description, and tags

---

## Customisation

### Change the colour scheme
All design tokens are CSS variables in `styles.css`:

```css
:root {
  --navy:      #0D1B2E;   /* page/card background */
  --gold:      #D4931A;   /* primary accent       */
  --text:      #E8EDF4;   /* body text            */
  --muted:     #7A8BA3;   /* secondary text       */
}
```

### Add a view
1. Add a `<div class="view" id="view-yourpage">` block in `index.html`.
2. Add a `<button class="nav-btn" data-view="yourpage">` to the `<nav>`.
3. Add a `loadYourpage()` function in `app.js` and register it in the `loaders` map inside `loadCurrentView()`.

### Use a different wallet library

Replace `makeSigner()` in `app.js`:

```js
// wagmi / viem
function makeSigner() {
  return (msg) => signMessageAsync({ message: msg });
}

// ethers v6
function makeSigner() {
  const signer = await provider.getSigner();
  return (msg) => signer.signMessage(msg);
}
```

### Bundle for production

The template is vanilla ES modules — drop it straight into Vite, Webpack, or Rollup:

```bash
# Vite
npm create vite@latest my-app -- --template vanilla
# copy index.html, styles.css, sdk.js, app.js into src/
```

---

## SDK Reference (quick)

```js
import { MoatsGovernanceSDK } from "./sdk.js";

const sdk = new MoatsGovernanceSDK({ baseUrl: "https://your-app.replit.app" });

await sdk.projects.list()
await sdk.projects.get(id)
await sdk.projects.leaderboard(id)

await sdk.proposals.list({ status: "active", projectId: 1 })
await sdk.proposals.summary()
await sdk.proposals.get(id)
await sdk.proposals.create({ ... })
await sdk.proposals.update(id, { title, endDate, status })
await sdk.proposals.delete(id)

await sdk.votes.list(proposalId)
await sdk.votes.votingPower(proposalId, walletAddress)
await sdk.votes.castBasicVote(proposalId, "for", walletAddress, signerFn)
await sdk.votes.castWeightedVote(proposalId, { "Option A": 60, "B": 40 }, walletAddress, signerFn)

await sdk.admins.list({ projectId: 1 })
await sdk.admins.add({ walletAddress, projectId })
await sdk.admins.remove(id)

await sdk.moats.listVerified()
```

---

## Browser Compatibility

Requires a browser with native ES module support (all modern browsers).
No polyfills or transpilation needed.
