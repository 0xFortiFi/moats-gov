/**
 * Moats Governance SDK — browser-ready ES module
 * Generated from moats-governance-sdk.ts (types stripped)
 * https://github.com/your-org/moats-governance
 */

export class MoatsApiError extends Error {
  constructor(status, body, message) {
    super(message);
    this.name = "MoatsApiError";
    this.status = status;
    this.body = body;
  }
}

async function request(fetchFn, baseUrl, path, init = {}) {
  const url = `${baseUrl}/api${path}`;
  const res = await fetchFn(url, {
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.error ?? `HTTP ${res.status}`;
    throw new MoatsApiError(res.status, body, msg);
  }
  return body;
}

function toQS(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function buildBasicVoteMessage(proposalId, proposalTitle, choice, walletAddress, timestamp) {
  return [
    "Moats App Governance",
    "",
    `Confirm vote "${choice.toUpperCase()}" on proposal #${proposalId} (${proposalTitle}).`,
    "",
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

function buildWeightedVoteMessage(proposalId, proposalTitle, allocations, walletAddress, timestamp) {
  const lines = Object.entries(allocations)
    .filter(([, pct]) => pct > 0)
    .map(([opt, pct]) => `${opt}: ${pct}%`)
    .join("\n");
  return [
    "Moats App Governance",
    "",
    `Confirm weighted vote on proposal #${proposalId} (${proposalTitle}).`,
    "",
    lines,
    "",
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

class ProjectsResource {
  constructor(fetch, baseUrl) { this._fetch = fetch; this._base = baseUrl; }
  list()          { return request(this._fetch, this._base, "/projects"); }
  get(id)         { return request(this._fetch, this._base, `/projects/${id}`); }
  create(data)    { return request(this._fetch, this._base, "/projects", { method: "POST", body: JSON.stringify(data) }); }
  leaderboard(id) { return request(this._fetch, this._base, `/projects/${id}/leaderboard`); }
}

class ProposalsResource {
  constructor(fetch, baseUrl) { this._fetch = fetch; this._base = baseUrl; }
  list(params)    { return request(this._fetch, this._base, `/proposals${params ? toQS(params) : ""}`); }
  summary()       { return request(this._fetch, this._base, "/proposals/summary"); }
  get(id)         { return request(this._fetch, this._base, `/proposals/${id}`); }
  create(data)    { return request(this._fetch, this._base, "/proposals", { method: "POST", body: JSON.stringify(data) }); }
  update(id, data){ return request(this._fetch, this._base, `/proposals/${id}`, { method: "PATCH", body: JSON.stringify(data) }); }
  delete(id)      { return request(this._fetch, this._base, `/proposals/${id}`, { method: "DELETE" }); }
}

class VotesResource {
  constructor(fetch, baseUrl) { this._fetch = fetch; this._base = baseUrl; }
  list(proposalId)                       { return request(this._fetch, this._base, `/proposals/${proposalId}/votes`); }
  votingPower(proposalId, walletAddress) { return request(this._fetch, this._base, `/proposals/${proposalId}/voting-power/${walletAddress}`); }

  async castBasicVote(proposalId, choice, walletAddress, signer) {
    const proposal = await request(this._fetch, this._base, `/proposals/${proposalId}`);
    const timestamp = new Date().toISOString();
    const message = buildBasicVoteMessage(proposalId, proposal.title, choice, walletAddress, timestamp);
    const signature = await signer(message);
    return request(this._fetch, this._base, `/proposals/${proposalId}/votes`, {
      method: "POST",
      body: JSON.stringify({ walletAddress, choice, signature, message }),
    });
  }

  async castWeightedVote(proposalId, allocations, walletAddress, signer) {
    const proposal = await request(this._fetch, this._base, `/proposals/${proposalId}`);
    if (!proposal.options?.length) throw new Error("Use castBasicVote() for basic proposals.");
    const sum = Object.values(allocations).reduce((a, b) => a + b, 0);
    if (sum !== 100) throw new Error(`Allocations must sum to 100 (got ${sum}).`);
    for (const opt of Object.keys(allocations)) {
      if (!proposal.options.includes(opt)) throw new Error(`"${opt}" is not a valid option.`);
    }
    const cleaned = Object.fromEntries(Object.entries(allocations).filter(([, p]) => p > 0));
    const timestamp = new Date().toISOString();
    const message = buildWeightedVoteMessage(proposalId, proposal.title, cleaned, walletAddress, timestamp);
    const signature = await signer(message);
    return request(this._fetch, this._base, `/proposals/${proposalId}/votes`, {
      method: "POST",
      body: JSON.stringify({ walletAddress, allocations: cleaned, signature, message }),
    });
  }
}

class AdminsResource {
  constructor(fetch, baseUrl) { this._fetch = fetch; this._base = baseUrl; }
  list(params) { return request(this._fetch, this._base, `/admins${params ? toQS(params) : ""}`); }
  add(data)    { return request(this._fetch, this._base, "/admins", { method: "POST", body: JSON.stringify(data) }); }
  remove(id)   { return request(this._fetch, this._base, `/admins/${id}`, { method: "DELETE" }); }
}

class MoatsResource {
  constructor(fetch, baseUrl) { this._fetch = fetch; this._base = baseUrl; }
  listVerified() { return request(this._fetch, this._base, "/verified-moats"); }
}

export class MoatsGovernanceSDK {
  constructor({ baseUrl, fetch: fetchFn }) {
    const base = baseUrl.replace(/\/$/, "");
    const f = fetchFn ?? globalThis.fetch.bind(globalThis);
    this.projects  = new ProjectsResource(f, base);
    this.proposals = new ProposalsResource(f, base);
    this.votes     = new VotesResource(f, base);
    this.admins    = new AdminsResource(f, base);
    this.moats     = new MoatsResource(f, base);
  }
}

export default MoatsGovernanceSDK;
