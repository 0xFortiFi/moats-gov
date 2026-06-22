/**
 * Moats App Governance SDK
 * ========================
 * A standalone TypeScript/JavaScript SDK for integrating with the Moats
 * Governance API. Drop this single file into any JS/TS project.
 *
 * Quick start:
 *
 *   import { MoatsGovernanceSDK } from "./moats-governance-sdk";
 *
 *   const sdk = new MoatsGovernanceSDK({
 *     baseUrl: "https://your-app.replit.app",
 *   });
 *
 *   // Read
 *   const proposals = await sdk.proposals.list({ status: "active" });
 *   const votes     = await sdk.votes.list(proposals[0].id);
 *
 *   // Write — supply any function that signs a message with the user's wallet
 *   const signer = (msg: string) => window.ethereum.request({
 *     method: "personal_sign",
 *     params: [msg, walletAddress],
 *   });
 *   await sdk.votes.castBasicVote(proposalId, "for", walletAddress, signer);
 *
 * Compatible signers
 * ------------------
 *   wagmi / viem:   (msg) => signMessageAsync({ message: msg })
 *   ethers v6:      (msg) => signer.signMessage(msg)
 *   MetaMask raw:   (msg) => ethereum.request({ method: "personal_sign", params: [msg, addr] })
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ProposalStatus =
  | "active"
  | "passed"
  | "failed"
  | "pending"
  | "cancelled";

export type QuorumType =
  | "participation"
  | "approval"
  | "for_abstain"
  | "percentage"
  | "fixed_token"
  | "dual"
  | "veto"
  | "dynamic"
  | "time_weighted"
  | "tiered"
  | "security";

export type VotingMethod =
  | "basic"
  | "single_choice"
  | "approval_voting"
  | "ranked_choice"
  | "weighted"
  | "quadratic";

export type BasicChoice = "for" | "against" | "abstain";

/** A function that signs an arbitrary text message and returns the hex signature. */
export type SignerFn = (message: string) => Promise<string>;

// --- Projects ---

export interface Project {
  id: number;
  name: string;
  contractAddress: string;
  description: string | null;
  logoUrl: string | null;
  totalProposals: number;
  activeProposals: number;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  contractAddress: string;
  description?: string;
  logoUrl?: string;
}

export interface LeaderboardEntry {
  walletAddress: string;
  points: number;
  rank: number;
}

// --- Proposals ---

export interface Proposal {
  id: number;
  title: string;
  description: string | null;
  projectId: number;
  projectName: string;
  status: ProposalStatus;
  createdBy: string;
  quorumType: QuorumType;
  quorumThreshold: number;
  approvalThreshold: number | null;
  votingMethod: VotingMethod;
  /** Non-null for custom (non-basic) voting methods. */
  options: string[] | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
}

export interface ProposalSummary {
  total: number;
  active: number;
  passed: number;
  failed: number;
  pending: number;
  cancelled: number;
}

export interface CreateProposalInput {
  title: string;
  description?: string;
  projectId: number;
  quorumType: QuorumType;
  quorumThreshold: number;
  approvalThreshold?: number;
  votingMethod: VotingMethod;
  /**
   * Required for non-basic voting methods (2–10 unique options).
   * Leave undefined or empty for basic (FOR / AGAINST / ABSTAIN) proposals.
   */
  options?: string[];
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface UpdateProposalInput {
  title?: string;
  description?: string;
  endDate?: string;
  status?: ProposalStatus;
}

export interface ListProposalsParams {
  projectId?: number;
  status?: ProposalStatus;
}

// --- Votes ---

export interface Vote {
  id: number;
  proposalId: number;
  walletAddress: string;
  /** Set for basic (FOR/AGAINST/ABSTAIN) votes; null for weighted votes. */
  choice: string | null;
  /** Set for custom/weighted votes; null for basic votes. */
  allocations: Record<string, number> | null;
  moatPoints: number | null;
  createdAt: string;
}

export interface VotingPower {
  walletAddress: string;
  moatPoints: number | null;
  contractAddress: string;
}

// --- Admins ---

export interface Admin {
  id: number;
  projectId: number;
  walletAddress: string;
  createdAt: string;
}

export interface AddAdminInput {
  walletAddress: string;
  projectId: number;
}

export interface ListAdminsParams {
  projectId?: number;
}

// --- Verified Moats ---

export interface VerifiedMoat {
  contractAddress: string;
  name: string;
  network: string;
  description: string | null;
  tags: Array<{ name: string; color: string }>;
}

// ─── SDK Configuration ─────────────────────────────────────────────────────────

export interface MoatsGovernanceSDKConfig {
  /**
   * Base URL of your deployed Moats Governance instance.
   * Do NOT include a trailing slash.
   * Example: "https://my-app.replit.app"
   */
  baseUrl: string;
  /**
   * Optional: override the fetch implementation (e.g. for testing or Node.js
   * versions that need a polyfill). Defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string
  ) {
    super(message);
    this.name = "MoatsApiError";
  }
}

async function request<T>(
  fetchFn: typeof fetch,
  baseUrl: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${baseUrl}/api${path}`;
  const res = await fetchFn(url, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new ApiError(res.status, body, msg);
  }
  return body as T;
}

function toQS(params: Record<string, unknown>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

/**
 * Builds the canonical signed message for a basic (FOR/AGAINST/ABSTAIN) vote.
 * Must match the backend's messageMatchesVote() checker exactly.
 */
function buildBasicVoteMessage(
  proposalId: number,
  proposalTitle: string,
  choice: BasicChoice,
  walletAddress: string,
  timestamp: string
): string {
  return [
    "Moats App Governance",
    "",
    `Confirm vote "${choice.toUpperCase()}" on proposal #${proposalId} (${proposalTitle}).`,
    "",
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp}`,
  ].join("\n");
}

/**
 * Builds the canonical signed message for a weighted vote.
 * Must match the backend's messageMatchesWeightedVote() checker exactly.
 * Only options with pct > 0 are included (matching the backend's cleaned map).
 */
function buildWeightedVoteMessage(
  proposalId: number,
  proposalTitle: string,
  allocations: Record<string, number>,
  walletAddress: string,
  timestamp: string
): string {
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

// ─── Resource namespaces ───────────────────────────────────────────────────────

class ProjectsResource {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string
  ) {}

  /** List all governance projects (auto-synced from verified Moats). */
  list(): Promise<Project[]> {
    return request<Project[]>(this.fetch, this.baseUrl, "/projects");
  }

  /** Get a single project by ID. */
  get(id: number): Promise<Project> {
    return request<Project>(this.fetch, this.baseUrl, `/projects/${id}`);
  }

  /**
   * Register a new project manually.
   * Projects backed by verified Moats are auto-synced, so you usually
   * don't need this unless registering an unverified contract.
   */
  create(data: CreateProjectInput): Promise<Project> {
    return request<Project>(this.fetch, this.baseUrl, "/projects", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Top-100 Moat Points leaderboard for a project. */
  leaderboard(id: number): Promise<LeaderboardEntry[]> {
    return request<LeaderboardEntry[]>(
      this.fetch,
      this.baseUrl,
      `/projects/${id}/leaderboard`
    );
  }
}

class ProposalsResource {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string
  ) {}

  /** List proposals, optionally filtering by project or status. */
  list(params?: ListProposalsParams): Promise<Proposal[]> {
    const qs = params ? toQS(params as Record<string, unknown>) : "";
    return request<Proposal[]>(this.fetch, this.baseUrl, `/proposals${qs}`);
  }

  /** Aggregate counts across all proposals. */
  summary(): Promise<ProposalSummary> {
    return request<ProposalSummary>(this.fetch, this.baseUrl, "/proposals/summary");
  }

  /** Get a single proposal by ID. */
  get(id: number): Promise<Proposal> {
    return request<Proposal>(this.fetch, this.baseUrl, `/proposals/${id}`);
  }

  /**
   * Create a new governance proposal.
   *
   * For basic proposals (votingMethod: "basic"), leave `options` empty.
   * For all other methods, provide 2–10 unique option strings — voters will
   * cast weighted percentage allocations across them.
   */
  create(data: CreateProposalInput): Promise<Proposal> {
    return request<Proposal>(this.fetch, this.baseUrl, "/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update a proposal's title, description, end date, or status.
   * Only the proposal creator's wallet should call this in practice.
   */
  update(id: number, data: UpdateProposalInput): Promise<Proposal> {
    return request<Proposal>(this.fetch, this.baseUrl, `/proposals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Soft-delete (cancel) a proposal.
   * The proposal record is retained; its status becomes "cancelled".
   */
  delete(id: number): Promise<Proposal> {
    return request<Proposal>(this.fetch, this.baseUrl, `/proposals/${id}`, {
      method: "DELETE",
    });
  }
}

class VotesResource {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string
  ) {}

  /** List all votes for a proposal. */
  list(proposalId: number): Promise<Vote[]> {
    return request<Vote[]>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}/votes`
    );
  }

  /**
   * Get the Moat Points voting power for a wallet on a specific proposal.
   * Returns `moatPoints: null` if the Moat API is unreachable.
   */
  votingPower(proposalId: number, walletAddress: string): Promise<VotingPower> {
    return request<VotingPower>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}/voting-power/${walletAddress}`
    );
  }

  /**
   * Cast a FOR / AGAINST / ABSTAIN vote on a basic proposal.
   *
   * The SDK builds the canonical message, passes it to your `signer` function,
   * and submits the signed vote in one call.
   *
   * @param proposalId  - ID of the proposal to vote on
   * @param choice      - "for" | "against" | "abstain"
   * @param walletAddress - The voter's wallet address (checksummed or lowercase)
   * @param signer      - A function that signs a text message and returns the
   *                      hex signature (see top of file for examples)
   *
   * @throws {MoatsApiError} if the proposal is closed, already voted, or the
   *                          signature is invalid
   */
  async castBasicVote(
    proposalId: number,
    choice: BasicChoice,
    walletAddress: string,
    signer: SignerFn
  ): Promise<Vote> {
    const proposal = await request<Proposal>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}`
    );
    const timestamp = new Date().toISOString();
    const message = buildBasicVoteMessage(
      proposalId,
      proposal.title,
      choice,
      walletAddress,
      timestamp
    );
    const signature = await signer(message);
    return request<Vote>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}/votes`,
      {
        method: "POST",
        body: JSON.stringify({ walletAddress, choice, signature, message }),
      }
    );
  }

  /**
   * Cast a weighted vote on a custom-option proposal.
   *
   * Voters spread 100 percentage points across the proposal's options.
   * The SDK validates locally before signing, builds the canonical message,
   * then submits in one call.
   *
   * @param proposalId  - ID of the proposal to vote on
   * @param allocations - Map of option → percentage (must sum to exactly 100)
   *                      Example: { "Option A": 60, "Option B": 40 }
   * @param walletAddress - The voter's wallet address
   * @param signer      - A function that signs a text message and returns the
   *                      hex signature
   *
   * @throws {Error}         if allocations don't sum to 100 or contain invalid keys
   * @throws {MoatsApiError} if the proposal is closed, already voted, or the
   *                          signature is invalid
   */
  async castWeightedVote(
    proposalId: number,
    allocations: Record<string, number>,
    walletAddress: string,
    signer: SignerFn
  ): Promise<Vote> {
    const proposal = await request<Proposal>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}`
    );

    if (!proposal.options || proposal.options.length === 0) {
      throw new Error(
        "This proposal uses basic voting (FOR/AGAINST/ABSTAIN). Use castBasicVote() instead."
      );
    }

    // Local validation — mirrors backend rules
    const sum = Object.values(allocations).reduce((acc, p) => acc + p, 0);
    if (sum !== 100) {
      throw new Error(
        `Allocations must sum to exactly 100 (got ${sum}).`
      );
    }
    for (const opt of Object.keys(allocations)) {
      if (!proposal.options.includes(opt)) {
        throw new Error(
          `"${opt}" is not a valid option for this proposal. Valid options: ${proposal.options.join(", ")}`
        );
      }
    }

    // Keep only options with pct > 0 (matching backend cleanup)
    const cleaned: Record<string, number> = {};
    for (const [opt, pct] of Object.entries(allocations)) {
      if (pct > 0) cleaned[opt] = pct;
    }

    const timestamp = new Date().toISOString();
    const message = buildWeightedVoteMessage(
      proposalId,
      proposal.title,
      cleaned,
      walletAddress,
      timestamp
    );
    const signature = await signer(message);
    return request<Vote>(
      this.fetch,
      this.baseUrl,
      `/proposals/${proposalId}/votes`,
      {
        method: "POST",
        body: JSON.stringify({
          walletAddress,
          allocations: cleaned,
          signature,
          message,
        }),
      }
    );
  }
}

class AdminsResource {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string
  ) {}

  /** List admins, optionally filtered by project. */
  list(params?: ListAdminsParams): Promise<Admin[]> {
    const qs = params ? toQS(params as Record<string, unknown>) : "";
    return request<Admin[]>(this.fetch, this.baseUrl, `/admins${qs}`);
  }

  /** Grant admin rights to a wallet for a project. */
  add(data: AddAdminInput): Promise<Admin> {
    return request<Admin>(this.fetch, this.baseUrl, "/admins", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** Revoke an admin record by its ID. */
  remove(id: number): Promise<Admin> {
    return request<Admin>(this.fetch, this.baseUrl, `/admins/${id}`, {
      method: "DELETE",
    });
  }
}

class MoatsResource {
  constructor(
    private fetch: typeof globalThis.fetch,
    private baseUrl: string
  ) {}

  /** List all Moats verified by the Moats protocol (cached 10 min server-side). */
  listVerified(): Promise<VerifiedMoat[]> {
    return request<VerifiedMoat[]>(this.fetch, this.baseUrl, "/verified-moats");
  }
}

// ─── Main class ────────────────────────────────────────────────────────────────

/**
 * Entry point for the Moats Governance SDK.
 *
 * ```ts
 * const sdk = new MoatsGovernanceSDK({ baseUrl: "https://your-app.replit.app" });
 *
 * // Projects
 * const projects  = await sdk.projects.list();
 * const project   = await sdk.projects.get(1);
 * const board     = await sdk.projects.leaderboard(1);
 *
 * // Proposals
 * const proposals = await sdk.proposals.list({ status: "active" });
 * const summary   = await sdk.proposals.summary();
 * const proposal  = await sdk.proposals.get(42);
 * const created   = await sdk.proposals.create({ ... });
 * await sdk.proposals.update(42, { status: "passed" });
 * await sdk.proposals.delete(42);
 *
 * // Votes
 * const votes     = await sdk.votes.list(42);
 * const power     = await sdk.votes.votingPower(42, "0xYourWallet");
 * await sdk.votes.castBasicVote(42, "for", "0xYourWallet", signerFn);
 * await sdk.votes.castWeightedVote(42, { "Option A": 70, "Option B": 30 }, "0xYourWallet", signerFn);
 *
 * // Admins
 * const admins    = await sdk.admins.list({ projectId: 1 });
 * const admin     = await sdk.admins.add({ walletAddress: "0x...", projectId: 1 });
 * await sdk.admins.remove(admin.id);
 *
 * // Verified Moats
 * const moats     = await sdk.moats.listVerified();
 * ```
 */
export class MoatsGovernanceSDK {
  readonly projects: ProjectsResource;
  readonly proposals: ProposalsResource;
  readonly votes: VotesResource;
  readonly admins: AdminsResource;
  readonly moats: MoatsResource;

  constructor(config: MoatsGovernanceSDKConfig) {
    const baseUrl = config.baseUrl.replace(/\/$/, "");
    const fetchFn = config.fetch ?? globalThis.fetch.bind(globalThis);

    this.projects  = new ProjectsResource(fetchFn, baseUrl);
    this.proposals = new ProposalsResource(fetchFn, baseUrl);
    this.votes     = new VotesResource(fetchFn, baseUrl);
    this.admins    = new AdminsResource(fetchFn, baseUrl);
    this.moats     = new MoatsResource(fetchFn, baseUrl);
  }
}

// ─── Named export of the error class so callers can catch specifically ─────────
export { ApiError as MoatsApiError };

// ─── Default export for convenience ───────────────────────────────────────────
export default MoatsGovernanceSDK;
