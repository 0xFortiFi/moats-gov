/**
 * Moats Governance UI Template — app.js
 * Full UI logic powered by the Moats Governance SDK.
 * Edit BASE_URL below to point at your deployed instance.
 */

import { MoatsGovernanceSDK, MoatsApiError } from "./sdk.js";

// ─── Config ────────────────────────────────────────────────────────────────────
let BASE_URL = localStorage.getItem("moats_base_url") || "";
let sdk = BASE_URL ? new MoatsGovernanceSDK({ baseUrl: BASE_URL }) : null;
let walletAddress = localStorage.getItem("moats_wallet") || "";

// ─── DOM helpers ───────────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};

function toast(msg, type = "info") {
  const c = $("#toast-container");
  const t = el("div", `toast ${type}`, msg);
  c.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

function showModal(content) {
  const overlay = el("div", "modal-overlay");
  overlay.innerHTML = `<div class="modal">${content}</div>`;
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  return overlay;
}

function closeModal() {
  $(".modal-overlay")?.remove();
}

function statusBadge(status) {
  const icons = { active: "●", pending: "◎", passed: "✓", failed: "✗", cancelled: "—" };
  return `<span class="badge badge-${status}"><span class="badge-dot"></span>${status}</span>`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";
}

function loading(container) {
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Loading…</div>`;
}

function empty(container, msg = "Nothing here yet.") {
  container.innerHTML = `<div class="empty"><div class="empty-icon">◎</div><p>${msg}</p></div>`;
}

function requireSDK() {
  if (!sdk) {
    toast("Enter your API base URL first.", "error");
    return false;
  }
  return true;
}

// ─── Wallet & config ───────────────────────────────────────────────────────────
function updateWalletDisplay() {
  const btn = $("#wallet-btn");
  btn.textContent = walletAddress ? fmtAddr(walletAddress) : "Connect Wallet";
}

async function connectWallet() {
  if (!window.ethereum) {
    toast("No wallet detected. Install MetaMask or a compatible wallet.", "error");
    return;
  }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    walletAddress = accounts[0];
    localStorage.setItem("moats_wallet", walletAddress);
    updateWalletDisplay();
    toast("Wallet connected: " + fmtAddr(walletAddress), "success");
  } catch (e) {
    toast("Wallet connection rejected.", "error");
  }
}

function makeSigner() {
  if (!walletAddress) throw new Error("Connect your wallet first.");
  if (!window.ethereum) throw new Error("No wallet detected.");
  return (msg) => window.ethereum.request({
    method: "personal_sign",
    params: [msg, walletAddress],
  });
}

function applyConfig() {
  const input = $("#config-url");
  const url = input.value.trim().replace(/\/$/, "");
  if (!url) return toast("Enter a valid URL.", "error");
  BASE_URL = url;
  localStorage.setItem("moats_base_url", url);
  sdk = new MoatsGovernanceSDK({ baseUrl: url });
  toast("Connected to " + url, "success");
  loadCurrentView();
}

// ─── Navigation ────────────────────────────────────────────────────────────────
let currentView = "dashboard";

function showView(name) {
  $$(".view").forEach((v) => v.classList.remove("active"));
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const v = $(`#view-${name}`);
  if (v) { v.classList.add("active"); currentView = name; loadCurrentView(); }
}

function loadCurrentView() {
  if (!sdk) return;
  const loaders = {
    dashboard: loadDashboard,
    projects:  loadProjects,
    proposals: loadProposals,
    moats:     loadMoats,
  };
  loaders[currentView]?.();
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  if (!requireSDK()) return;
  const statsEl  = $("#dash-stats");
  const recentEl = $("#dash-recent");
  loading(statsEl);

  try {
    const [summary, proposals] = await Promise.all([
      sdk.proposals.summary(),
      sdk.proposals.list(),
    ]);

    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Proposals</div><div class="stat-value">${summary.total}</div></div>
      <div class="stat-card"><div class="stat-label">Active</div><div class="stat-value" style="color:var(--success)">${summary.active}</div></div>
      <div class="stat-card"><div class="stat-label">Passed</div><div class="stat-value" style="color:#3498db">${summary.passed}</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value" style="color:var(--gold)">${summary.pending}</div></div>
    `;

    const recent = [...proposals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    if (!recent.length) { empty(recentEl, "No proposals yet."); return; }
    recentEl.innerHTML = recent.map((p) => proposalCardHTML(p)).join("");
    recentEl.querySelectorAll(".proposal-card").forEach((c) => {
      c.addEventListener("click", () => openProposalDetail(parseInt(c.dataset.id)));
    });
  } catch (e) {
    statsEl.innerHTML = `<div class="empty"><p style="color:var(--danger)">${e.message}</p></div>`;
  }
}

// ─── Projects ──────────────────────────────────────────────────────────────────
async function loadProjects() {
  if (!requireSDK()) return;
  const container = $("#projects-list");
  loading(container);
  try {
    const projects = await sdk.projects.list();
    if (!projects.length) { empty(container, "No projects found."); return; }
    container.innerHTML = projects.map((p) => `
      <div class="project-card" data-id="${p.id}">
        <div class="project-name">${p.name}</div>
        <div class="project-desc">${p.description || "No description."}</div>
        <div class="project-meta">
          <div class="project-stat"><strong>${p.totalProposals ?? 0}</strong> proposals</div>
          <div class="project-stat"><strong>${p.activeProposals ?? 0}</strong> active</div>
        </div>
        <div class="project-address">${p.contractAddress}</div>
      </div>
    `).join("");
    container.querySelectorAll(".project-card").forEach((c) => {
      c.addEventListener("click", () => openProjectDetail(parseInt(c.dataset.id)));
    });
  } catch (e) {
    empty(container, e.message);
  }
}

async function openProjectDetail(id) {
  if (!requireSDK()) return;
  try {
    const [project, proposals, board] = await Promise.all([
      sdk.projects.get(id),
      sdk.proposals.list({ projectId: id }),
      sdk.projects.leaderboard(id).catch(() => []),
    ]);

    const overlay = showModal(`
      <div class="modal-header">
        <div>
          <h2>${project.name}</h2>
          <div style="font-family:monospace;font-size:.78rem;color:var(--muted);margin-top:.25rem">${project.contractAddress}</div>
        </div>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <p style="color:var(--muted);font-size:.9rem;margin-bottom:1.5rem">${project.description || "No description."}</p>
      <div class="tabs">
        <button class="tab-btn active" data-tab="proposals-tab">Proposals (${proposals.length})</button>
        <button class="tab-btn" data-tab="board-tab">Leaderboard</button>
      </div>
      <div id="proposals-tab" class="tab-content active">
        ${proposals.length
          ? proposals.map((p) => `<div class="proposal-card" data-id="${p.id}" style="margin-bottom:.75rem">
              <div class="proposal-header"><div class="proposal-title">${p.title}</div>${statusBadge(p.status)}</div>
              <div class="proposal-meta"><span class="proposal-dates">Ends ${fmtDate(p.endDate)}</span><span class="proposal-votes">${p.totalVotes} votes</span></div>
            </div>`).join("")
          : '<div class="empty" style="padding:2rem"><p>No proposals yet.</p></div>'}
      </div>
      <div id="board-tab" class="tab-content">
        ${board.length
          ? `<div class="table-wrap"><table><thead><tr><th>#</th><th>Wallet</th><th>Points</th></tr></thead><tbody>
              ${board.slice(0, 20).map((e) => `<tr><td>${e.rank}</td><td class="mono">${fmtAddr(e.walletAddress)}</td><td>${e.points.toLocaleString()}</td></tr>`).join("")}
            </tbody></table></div>`
          : '<div class="empty" style="padding:2rem"><p>Leaderboard unavailable.</p></div>'}
      </div>
    `);

    overlay.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        overlay.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
        overlay.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        overlay.querySelector("#" + btn.dataset.tab).classList.add("active");
      });
    });
    overlay.querySelectorAll(".proposal-card").forEach((c) => {
      c.addEventListener("click", () => { closeModal(); openProposalDetail(parseInt(c.dataset.id)); });
    });
  } catch (e) {
    toast(e.message, "error");
  }
}

// ─── Proposals list ────────────────────────────────────────────────────────────
let currentFilter = "all";

async function loadProposals() {
  if (!requireSDK()) return;
  const container = $("#proposals-list");
  loading(container);
  try {
    const params = currentFilter === "all" ? {} : { status: currentFilter };
    const proposals = await sdk.proposals.list(params);
    if (!proposals.length) { empty(container, "No proposals found."); return; }
    const sorted = [...proposals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    container.innerHTML = sorted.map((p) => proposalCardHTML(p)).join("");
    container.querySelectorAll(".proposal-card").forEach((c) => {
      c.addEventListener("click", () => openProposalDetail(parseInt(c.dataset.id)));
    });
  } catch (e) {
    empty(container, e.message);
  }
}

function proposalCardHTML(p) {
  return `
    <div class="proposal-card" data-id="${p.id}">
      <div class="proposal-header">
        <div class="proposal-title">${p.title}</div>
        ${statusBadge(p.status)}
      </div>
      <div class="proposal-meta">
        <span class="proposal-project">◎ ${p.projectName}</span>
        <span class="proposal-dates">Ends ${fmtDate(p.endDate)}</span>
        <span class="proposal-votes">${p.totalVotes ?? 0} votes</span>
      </div>
    </div>`;
}

// ─── Proposal detail ───────────────────────────────────────────────────────────
async function openProposalDetail(id) {
  if (!requireSDK()) return;
  const detailView = $("#view-proposal-detail");
  const detailContent = $("#proposal-detail-content");

  $$(".view").forEach((v) => v.classList.remove("active"));
  detailView.classList.add("active");
  loading(detailContent);

  try {
    const [proposal, votes] = await Promise.all([
      sdk.proposals.get(id),
      sdk.votes.list(id),
    ]);

    const isBasic   = !proposal.options?.length;
    const isOpen    = proposal.status !== "cancelled" &&
                      Date.now() >= new Date(proposal.startDate).getTime() &&
                      Date.now() <= new Date(proposal.endDate).getTime();
    const hasVoted  = votes.some((v) => v.walletAddress?.toLowerCase() === walletAddress?.toLowerCase());

    // ── Results ──
    const resultsHTML = buildResultsHTML(proposal, votes, isBasic);

    // ── Vote UI ──
    const voteHTML = buildVoteHTML(proposal, isBasic, isOpen, hasVoted);

    // ── Votes table ──
    const votesTable = votes.length
      ? `<div class="table-wrap"><table>
          <thead><tr><th>Voter</th><th>Vote</th><th>Points</th><th>Time</th></tr></thead>
          <tbody>${votes.map((v) => `
            <tr>
              <td class="mono">${fmtAddr(v.walletAddress)}</td>
              <td>${formatVoteCell(v)}</td>
              <td>${v.moatPoints != null ? v.moatPoints.toLocaleString() : "—"}</td>
              <td style="color:var(--muted)">${fmtDate(v.createdAt)}</td>
            </tr>`).join("")}
          </tbody></table></div>`
      : '<div class="empty" style="padding:2rem"><p>No votes cast yet.</p></div>';

    detailContent.innerHTML = `
      <button class="back-btn" id="back-btn">← Back</button>
      <div class="proposal-detail-header">
        <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:.75rem">
          <h1>${proposal.title}</h1>
          ${statusBadge(proposal.status)}
        </div>
        <div class="detail-meta">
          <span>◎ ${proposal.projectName}</span>
          <span>Starts ${fmtDate(proposal.startDate)}</span>
          <span>Ends ${fmtDate(proposal.endDate)}</span>
          <span>Method: ${proposal.votingMethod.replace("_", " ")}</span>
          <span>Quorum: ${proposal.quorumType} ≥${proposal.quorumThreshold}${proposal.quorumThreshold <= 100 ? "%" : ""}</span>
        </div>
      </div>

      <div class="detail-grid">
        <div>
          <div class="card" style="margin-bottom:1.25rem">
            <div class="card-title">Description</div>
            <p style="color:var(--muted);font-size:.9rem;line-height:1.7">${proposal.description || "No description provided."}</p>
          </div>
          <div class="card" style="margin-bottom:1.25rem">
            <div class="card-title">Current Results</div>
            ${resultsHTML}
          </div>
          <div class="card">
            <div class="card-title" style="margin-bottom:1rem">Votes (${votes.length})</div>
            ${votesTable}
          </div>
        </div>
        <div>
          <div class="vote-panel" id="vote-panel">
            ${voteHTML}
          </div>
        </div>
      </div>
    `;

    detailContent.querySelector("#back-btn").addEventListener("click", () => {
      detailView.classList.remove("active");
      $("#view-" + currentView)?.classList.add("active");
    });

    wireVotePanel(proposal, isBasic, isOpen, hasVoted);

  } catch (e) {
    detailContent.innerHTML = `<button class="back-btn" id="back-btn2">← Back</button><div class="empty"><p style="color:var(--danger)">${e.message}</p></div>`;
    detailContent.querySelector("#back-btn2").addEventListener("click", () => {
      detailView.classList.remove("active");
      $("#view-" + currentView)?.classList.add("active");
    });
  }
}

function formatVoteCell(v) {
  if (v.choice) {
    const colors = { for: "var(--success)", against: "var(--danger)", abstain: "var(--muted)" };
    return `<span style="color:${colors[v.choice] || "inherit"};font-weight:600">${v.choice.toUpperCase()}</span>`;
  }
  if (v.allocations) {
    return Object.entries(v.allocations)
      .map(([opt, pct]) => `<span class="badge badge-pending" style="margin-right:.25rem">${opt}: ${pct}%</span>`)
      .join("");
  }
  return "—";
}

function buildResultsHTML(proposal, votes, isBasic) {
  if (!votes.length) return `<p style="color:var(--muted);font-size:.9rem">No votes yet.</p>`;

  if (isBasic) {
    const total = votes.length || 1;
    const counts = { for: proposal.votesFor ?? 0, against: proposal.votesAgainst ?? 0, abstain: proposal.votesAbstain ?? 0 };
    return ["for", "against", "abstain"].map((c) => {
      const pct = Math.round((counts[c] / total) * 100);
      return `
        <div class="result-bar-wrap">
          <div class="result-bar-header"><span>${c.toUpperCase()}</span><span>${counts[c]} (${pct}%)</span></div>
          <div class="result-bar-track"><div class="result-bar-fill ${c}" style="width:${pct}%"></div></div>
        </div>`;
    }).join("");
  }

  // Weighted: derive per-option totals
  const optionTotals = {};
  let grandTotal = 0;
  for (const v of votes) {
    if (v.allocations) {
      for (const [opt, pct] of Object.entries(v.allocations)) {
        optionTotals[opt] = (optionTotals[opt] ?? 0) + pct;
        grandTotal += pct;
      }
    } else if (v.choice) {
      optionTotals[v.choice] = (optionTotals[v.choice] ?? 0) + 100;
      grandTotal += 100;
    }
  }
  const options = proposal.options ?? Object.keys(optionTotals);
  return options.map((opt) => {
    const raw = optionTotals[opt] ?? 0;
    const pct = grandTotal > 0 ? Math.round((raw / grandTotal) * 100) : 0;
    return `
      <div class="result-bar-wrap">
        <div class="result-bar-header"><span>${opt}</span><span>${pct}%</span></div>
        <div class="result-bar-track"><div class="result-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");
}

function buildVoteHTML(proposal, isBasic, isOpen, hasVoted) {
  if (!isOpen) {
    return `<h3>Voting Closed</h3><p style="color:var(--muted);font-size:.9rem;margin-top:.5rem">This proposal's voting window has ended.</p>`;
  }
  if (hasVoted) {
    return `<h3>Your Vote</h3><p style="color:var(--success);font-size:.9rem;margin-top:.5rem">✓ You have already voted on this proposal.</p>`;
  }
  if (!walletAddress) {
    return `<h3>Cast Your Vote</h3>
      <p style="color:var(--muted);font-size:.9rem;margin:.75rem 0 1rem">Connect your wallet to vote.</p>
      <button class="btn btn-primary btn-full" id="vote-connect-btn">Connect Wallet</button>`;
  }

  if (isBasic) {
    return `
      <h3>Cast Your Vote</h3>
      <p style="color:var(--muted);font-size:.82rem;margin:.5rem 0 1rem">Voting as ${fmtAddr(walletAddress)}</p>
      <div class="basic-choices">
        ${[["for","✓","For"],["against","✗","Against"],["abstain","◎","Abstain"]].map(([val, icon, label]) => `
          <button class="choice-btn" data-choice="${val}">
            <span class="choice-icon">${icon}</span> ${label}
          </button>`).join("")}
      </div>
      <button class="btn btn-primary btn-full" id="submit-vote-btn" disabled>Submit Vote</button>
    `;
  }

  const options = proposal.options ?? [];
  return `
    <h3>Cast Your Vote</h3>
    <p style="color:var(--muted);font-size:.82rem;margin:.5rem 0 1rem">Allocate 100% across the options below.</p>
    <div class="weighted-options" id="weighted-options">
      ${options.map((opt) => `
        <div class="weighted-row">
          <span class="weighted-label">${opt}</span>
          <input type="number" class="weighted-input" data-option="${opt}" min="0" max="100" value="0" />
          <span class="pct-suffix">%</span>
        </div>`).join("")}
    </div>
    <div class="allocation-total" id="allocation-total">
      <span>Total allocated</span><strong>0% / 100%</strong>
    </div>
    <button class="btn btn-primary btn-full" id="submit-vote-btn" disabled>Submit Votes</button>
  `;
}

function wireVotePanel(proposal, isBasic, isOpen, hasVoted) {
  const panel = $("#vote-panel");
  if (!panel) return;

  panel.querySelector("#vote-connect-btn")?.addEventListener("click", connectWallet);

  if (isBasic && isOpen && !hasVoted && walletAddress) {
    let selectedChoice = null;
    panel.querySelectorAll(".choice-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.querySelectorAll(".choice-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedChoice = btn.dataset.choice;
        panel.querySelector("#submit-vote-btn").disabled = false;
      });
    });

    panel.querySelector("#submit-vote-btn").addEventListener("click", async () => {
      if (!selectedChoice) return;
      const btn = panel.querySelector("#submit-vote-btn");
      btn.disabled = true; btn.textContent = "Signing…";
      try {
        await sdk.votes.castBasicVote(proposal.id, selectedChoice, walletAddress, makeSigner());
        toast("Vote cast successfully!", "success");
        openProposalDetail(proposal.id);
      } catch (e) {
        toast(e.message, "error");
        btn.disabled = false; btn.textContent = "Submit Vote";
      }
    });
  }

  if (!isBasic && isOpen && !hasVoted && walletAddress) {
    const inputs = [...panel.querySelectorAll(".weighted-input")];
    const totalEl = panel.querySelector("#allocation-total");

    function updateTotal() {
      const sum = inputs.reduce((acc, i) => acc + (parseInt(i.value) || 0), 0);
      totalEl.querySelector("strong").textContent = `${sum}% / 100%`;
      totalEl.classList.toggle("ok",   sum === 100);
      totalEl.classList.toggle("over", sum > 100);
      panel.querySelector("#submit-vote-btn").disabled = sum !== 100;
    }
    inputs.forEach((i) => i.addEventListener("input", updateTotal));

    panel.querySelector("#submit-vote-btn").addEventListener("click", async () => {
      const allocations = {};
      inputs.forEach((i) => { allocations[i.dataset.option] = parseInt(i.value) || 0; });
      const btn = panel.querySelector("#submit-vote-btn");
      btn.disabled = true; btn.textContent = "Signing…";
      try {
        await sdk.votes.castWeightedVote(proposal.id, allocations, walletAddress, makeSigner());
        toast("Weighted vote submitted!", "success");
        openProposalDetail(proposal.id);
      } catch (e) {
        toast(e.message, "error");
        btn.disabled = false; btn.textContent = "Submit Votes";
      }
    });
  }
}

// ─── Moats ─────────────────────────────────────────────────────────────────────
async function loadMoats() {
  if (!requireSDK()) return;
  const container = $("#moats-list");
  loading(container);
  try {
    const moats = await sdk.moats.listVerified();
    if (!moats.length) { empty(container, "No verified moats found."); return; }
    container.innerHTML = moats.map((m) => `
      <div class="project-card">
        <div class="project-name">${m.name}</div>
        <div class="project-desc">${m.description || "No description."}</div>
        <div class="project-meta">
          <div class="project-stat"><strong>${m.network}</strong></div>
          ${m.tags?.map((t) => `<span class="badge" style="background:${t.color}22;color:${t.color}">${t.name}</span>`).join("") ?? ""}
        </div>
        <div class="project-address">${m.contractAddress}</div>
      </div>
    `).join("");
  } catch (e) {
    empty(container, e.message);
  }
}

// ─── Create Proposal modal ─────────────────────────────────────────────────────
async function openCreateProposal() {
  if (!requireSDK()) return;
  let projects = [];
  try { projects = await sdk.projects.list(); } catch {}

  const overlay = showModal(`
    <div class="modal-header">
      <h2>Create Proposal</h2>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
    </div>
    <div class="form-group">
      <label>Moat / Project</label>
      <select id="cp-project">
        <option value="">Select a project…</option>
        ${projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
      </select>
    </div>
    <div class="form-group"><label>Title</label><input id="cp-title" placeholder="Proposal title" /></div>
    <div class="form-group"><label>Description</label><textarea id="cp-desc" placeholder="Detailed rationale…"></textarea></div>
    <div class="form-row">
      <div class="form-group">
        <label>Voting Method</label>
        <select id="cp-method">
          <option value="basic">Basic (FOR/AGAINST/ABSTAIN)</option>
          <option value="single_choice">Single Choice</option>
          <option value="weighted">Weighted</option>
          <option value="approval_voting">Approval Voting</option>
          <option value="ranked_choice">Ranked Choice</option>
          <option value="quadratic">Quadratic</option>
        </select>
      </div>
      <div class="form-group">
        <label>Quorum Type</label>
        <select id="cp-quorum">
          <option value="participation">Participation</option>
          <option value="approval">Approval Only</option>
          <option value="percentage">Percentage</option>
          <option value="dual">Dual Quorum</option>
          <option value="veto">Veto</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Quorum Threshold (%)</label><input id="cp-threshold" type="number" value="10" min="1" max="100" /></div>
    <div id="cp-options-wrap" style="display:none">
      <div class="form-group">
        <label>Options (one per line, 2–10)</label>
        <textarea id="cp-options" placeholder="Option A&#10;Option B&#10;Option C" style="min-height:100px"></textarea>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Date</label><input id="cp-start" type="datetime-local" /></div>
      <div class="form-group"><label>End Date</label><input id="cp-end" type="datetime-local" /></div>
    </div>
    <div class="form-group"><label>Created By (wallet)</label><input id="cp-wallet" value="${walletAddress}" placeholder="0x…" /></div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
      <button class="btn btn-primary" id="cp-submit">Create Proposal</button>
    </div>
  `);

  const methodSel = overlay.querySelector("#cp-method");
  const optionsWrap = overlay.querySelector("#cp-options-wrap");
  methodSel.addEventListener("change", () => {
    optionsWrap.style.display = methodSel.value !== "basic" ? "block" : "none";
  });

  // Pre-fill start date to now
  const now = new Date();
  now.setSeconds(0, 0);
  overlay.querySelector("#cp-start").value = now.toISOString().slice(0, 16);
  const weekOut = new Date(now.getTime() + 7 * 864e5);
  overlay.querySelector("#cp-end").value = weekOut.toISOString().slice(0, 16);

  overlay.querySelector("#cp-submit").addEventListener("click", async () => {
    const projectId = parseInt(overlay.querySelector("#cp-project").value);
    const title     = overlay.querySelector("#cp-title").value.trim();
    const desc      = overlay.querySelector("#cp-desc").value.trim();
    const method    = overlay.querySelector("#cp-method").value;
    const quorum    = overlay.querySelector("#cp-quorum").value;
    const threshold = parseFloat(overlay.querySelector("#cp-threshold").value);
    const start     = overlay.querySelector("#cp-start").value;
    const end       = overlay.querySelector("#cp-end").value;
    const createdBy = overlay.querySelector("#cp-wallet").value.trim() || walletAddress;

    if (!projectId || !title || !start || !end) return toast("Fill in all required fields.", "error");

    let options;
    if (method !== "basic") {
      options = overlay.querySelector("#cp-options").value.split("\n").map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) return toast("Add at least 2 options.", "error");
    }

    const btn = overlay.querySelector("#cp-submit");
    btn.disabled = true; btn.textContent = "Creating…";
    try {
      await sdk.proposals.create({
        title, description: desc, projectId,
        quorumType: quorum, quorumThreshold: threshold,
        votingMethod: method, options,
        startDate: new Date(start).toISOString(),
        endDate:   new Date(end).toISOString(),
        createdBy,
      });
      toast("Proposal created!", "success");
      closeModal();
      if (currentView === "proposals") loadProposals();
      if (currentView === "dashboard")  loadDashboard();
    } catch (e) {
      toast(e.message, "error");
      btn.disabled = false; btn.textContent = "Create Proposal";
    }
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
function init() {
  // Config bar
  const configInput = $("#config-url");
  if (configInput && BASE_URL) configInput.value = BASE_URL;
  $("#apply-config")?.addEventListener("click", applyConfig);
  configInput?.addEventListener("keydown", (e) => { if (e.key === "Enter") applyConfig(); });

  // Nav
  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.view));
  });

  // Wallet
  $("#wallet-btn")?.addEventListener("click", connectWallet);
  updateWalletDisplay();

  // Create proposal button
  $("#create-proposal-btn")?.addEventListener("click", openCreateProposal);

  // Proposal filter tabs
  $$(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      if (currentView === "proposals") loadProposals();
    });
  });

  // Initial load
  if (sdk) loadCurrentView();
}

document.addEventListener("DOMContentLoaded", init);
