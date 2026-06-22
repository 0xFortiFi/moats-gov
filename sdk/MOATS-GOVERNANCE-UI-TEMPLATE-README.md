# Moats Governance — UI Template

A ready-to-use frontend template for building Moats-powered governance interfaces.
Dark-only brand design (deep navy + gold), zero build step, fully wired to the Moats Governance SDK.

---

## Contents

- [What's Included](#whats-included)
- [Quick Start](#quick-start)
- [Screens & Features](#screens--features)
- [Connecting a Wallet](#connecting-a-wallet)
- [Customisation](#customisation)
- [Bundling for Production](#bundling-for-production)
- [File Reference](#file-reference)

---

## What's Included

```
moats-governance-ui-template/
├── index.html    — Single-page app shell (all views and markup)
├── styles.css    — Full Moats dark theme (navy, gold, responsive)
├── sdk.js        — Browser-ready Moats Governance SDK (ES module)
├── app.js        — All UI logic wired to the SDK
└── README.md     — This file
```

No npm, no Webpack, no build step. Open in any modern browser.

---

## Quick Start

**Step 1 — Serve the files locally**

ES modules require a server (not a `file://` URL). Use any of these:

```bash
# Python (built-in)
python3 -m http.server 3000

# Node.js
npx serve .

# VS Code
# Install "Live Server" → right-click index.html → "Open with Live Server"
```

**Step 2 — Open in your browser**

```
http://localhost:3000
```

**Step 3 — Connect to your API**

Enter your deployed Moats Governance API URL in the bar at the top of the page:

```
https://your-app.replit.app
```

Click **Connect** — all views will load live data immediately.

**Step 4 — Connect your wallet**

Click **Connect Wallet** in the header. MetaMask or any `window.ethereum`-compatible wallet is supported.
Once connected, you can cast votes directly from the browser.

---

## Screens & Features

### Dashboard

The landing screen. Shows at a glance:

- **Summary stats** — Total, Active, Passed, and Pending proposal counts pulled live from the API.
- **Recent proposals** — The five most recently created proposals with status badges and click-through to the detail view.

---

### Projects

A browsable grid of all governance projects linked to verified Moats.

- Each card shows the project name, description, proposal count, and contract address.
- **Click any card** to open a modal with:
  - Full proposal list for that project.
  - A top-20 Moat Points leaderboard.

---

### Proposals

The main governance feed.

- **Filter tabs** — All / Active / Pending / Passed / Failed.
- **Create Proposal** — Opens a full modal form with:
  - Project selector (pulls live list from the API).
  - Title, description, voting method, quorum type & threshold.
  - Optional custom options (for weighted / choice proposals).
  - Start and end date pickers.
- **Click any card** to open the full Proposal Detail view.

---

### Proposal Detail

A dedicated view (replaces the current page, with a ← Back button) showing:

| Section | Content |
|---------|---------|
| Header | Title, status badge, project, dates, voting method, quorum info |
| Description | Full proposal text |
| Current Results | Live progress bars — FOR/AGAINST/ABSTAIN for basic proposals; per-option share for weighted ones |
| Voting Panel | Wallet-gated vote UI (see below) |
| Votes Table | All cast votes: voter address, choice or allocation, Moat Points, timestamp |

#### Voting panel states

| State | What the user sees |
|-------|--------------------|
| Voting closed | "Voting Closed" message |
| No wallet connected | Prompt with a Connect Wallet button |
| Already voted | Green confirmation tick |
| Basic proposal, open | FOR / AGAINST / ABSTAIN buttons → one-click sign & submit |
| Weighted proposal, open | Percentage input per option (must total 100%) → sign & submit |

Both vote types trigger a wallet signature via `personal_sign` before submitting to the API. The signed message is human-readable and displayed in the wallet UI.

---

### Verified Moats

A grid of all protocols verified by the Moats protocol. Data is cached server-side for 10 minutes. Shows name, description, network, contract address, and tags.

---

## Connecting a Wallet

The template uses `window.ethereum` (MetaMask standard). Any wallet that injects `window.ethereum` works out of the box — MetaMask, Coinbase Wallet, Rabby, etc.

To use a different wallet library, replace `makeSigner()` in `app.js`:

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

### Brand colours

All design tokens are CSS variables at the top of `styles.css`:

```css
:root {
  --navy:       #0D1B2E;   /* page and card background */
  --navy-card:  #112240;   /* card surface             */
  --navy-hover: #162B50;   /* hover state              */
  --border:     rgba(212,147,26,.18);
  --gold:       #D4931A;   /* primary accent / CTA     */
  --gold-hover: #e8a828;
  --text:       #E8EDF4;   /* body text                */
  --muted:      #7A8BA3;   /* secondary / label text   */
  --success:    #2ecc71;
  --danger:     #e74c3c;
}
```

Change `--gold` and `--navy` to match your own brand in seconds.

### Adding a new view

1. Add a view container in `index.html`:

```html
<div class="view" id="view-analytics">
  <div class="section-header">
    <h1>Analytics</h1>
  </div>
  <!-- your content -->
</div>
```

2. Add a nav button:

```html
<button class="nav-btn" data-view="analytics">Analytics</button>
```

3. Add a loader in `app.js`:

```js
// Inside loadCurrentView()
const loaders = {
  dashboard:  loadDashboard,
  projects:   loadProjects,
  proposals:  loadProposals,
  moats:      loadMoats,
  analytics:  loadAnalytics,   // ← add this line
};

// Then define the function:
async function loadAnalytics() {
  const proposals = await sdk.proposals.list();
  // build your charts / tables here
}
```

### Styling components

The template uses utility-style CSS classes. Common ones:

| Class | Purpose |
|-------|---------|
| `.card` | Standard card container |
| `.grid-2` | 2-column responsive grid |
| `.grid-4` | 4-column stat grid |
| `.btn .btn-primary` | Gold CTA button |
| `.btn .btn-outline` | Bordered ghost button |
| `.badge .badge-active` | Status badge (active / pending / passed / failed) |
| `.stat-card` | Dashboard metric tile |
| `.empty` | Centred empty-state block |
| `.loading` | Spinner + "Loading…" row |

---

## Bundling for Production

The template is plain ES modules — it drops straight into any bundler.

### Vite

```bash
npm create vite@latest my-governance-app -- --template vanilla
```

Copy the four files into `src/`, update `index.html` to use Vite's entry point, and run:

```bash
npm run build
```

### Next.js / React

Import `sdk.js` as a utility module and rewrite `app.js` logic as React components.
The SDK has no browser-only dependencies — it works in SSR contexts with a custom `fetch`.

---

## File Reference

### `index.html`

Pure HTML markup — no inline scripts, no inline styles. Contains:

- The sticky header with nav and wallet button.
- The config bar for entering the API URL.
- One `<div class="view">` per screen (Dashboard, Projects, Proposals, Proposal Detail, Verified Moats).
- All static skeleton markup for empty states.

### `styles.css`

~600 lines of component CSS. Organised sections:

- Reset + CSS variables
- Layout (header, main, views)
- Cards, grids, stat tiles
- Project and proposal cards
- Status badges
- Buttons and form elements
- Vote panel (basic choices + weighted allocation)
- Result progress bars
- Data table
- Filter tabs
- Modals
- Toast notifications
- Empty and loading states
- Responsive breakpoints

### `sdk.js`

Browser-ready ES module — a direct transpile of `moats-governance-sdk.ts` with TypeScript annotations removed. Exports:

- `MoatsGovernanceSDK` — main SDK class
- `MoatsApiError` — typed error class

### `app.js`

~450 lines of vanilla JS. Organised sections:

- Config and SDK initialisation (reads `localStorage` for persisted URL + wallet)
- DOM helpers (`$`, `$$`, `el`, `toast`, `showModal`, etc.)
- Wallet connection (`connectWallet`, `makeSigner`)
- Navigation (`showView`, `loadCurrentView`)
- Dashboard loader
- Projects loader + project detail modal
- Proposals loader + filter tabs
- Proposal detail view (results, vote panel, votes table)
- Create Proposal modal
- Verified Moats loader
- Bootstrap (`init` — wires all event listeners on `DOMContentLoaded`)
