import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { votesTable, proposalsTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CastVoteBody } from "@workspace/api-zod";
import { verifyMessage, isAddress, getAddress } from "viem";

const router: IRouter = Router();

// Confirms the signed message is bound to this exact vote action (proposal,
// choice, wallet) and is recent, so a captured signature cannot be replayed
// for a different choice/proposal or long after it was produced. Must stay in
// sync with the message built on the client in proposal-detail.tsx.
function messageMatchesVote(
  message: string,
  walletAddress: string,
  proposalId: number,
  choice: string
): boolean {
  const choiceOk = message.includes(`"${choice.toUpperCase()}"`);
  const proposalOk = message.includes(`proposal #${proposalId}`);
  const walletOk = message.toLowerCase().includes(walletAddress.toLowerCase());
  const tsMatch = message.match(/Timestamp:\s*(\S+)/);
  let freshOk = false;
  if (tsMatch) {
    const ts = Date.parse(tsMatch[1]);
    if (!Number.isNaN(ts)) {
      freshOk = Math.abs(Date.now() - ts) <= 10 * 60 * 1000;
    }
  }
  return choiceOk && proposalOk && walletOk && freshOk;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Weighted-vote variant: confirms the signed message is bound to this proposal,
// wallet, and is recent, AND that the allocation block in the signed message is
// EXACTLY the allocation being stored — same options, same percentages, with no
// extra, missing, or conflicting "<option>: <pct>%" lines. An exact comparison
// (rather than substring checks) prevents a signature from being bound to a
// different allocation than what gets recorded. Must stay in sync with the
// weighted message built on the client in proposal-detail.tsx.
function messageMatchesWeightedVote(
  message: string,
  walletAddress: string,
  proposalId: number,
  allocations: Record<string, number>,
  options: string[]
): boolean {
  const proposalOk = message.includes(`proposal #${proposalId}`);
  const walletOk = message.toLowerCase().includes(walletAddress.toLowerCase());

  const tsMatch = message.match(/Timestamp:\s*(\S+)/);
  let freshOk = false;
  if (tsMatch) {
    const ts = Date.parse(tsMatch[1]);
    if (!Number.isNaN(ts)) {
      freshOk = Math.abs(Date.now() - ts) <= 10 * 60 * 1000;
    }
  }

  // Reconstruct the allocation map from the signed message, anchored on the
  // proposal's known options and full-line boundaries (so overlapping option
  // names cannot be confused with one another).
  const fromMessage: Record<string, number> = {};
  for (const opt of options) {
    const re = new RegExp(`(?:^|\\n)${escapeRegExp(opt)}: (\\d+)%(?=\\n|$)`);
    const m = message.match(re);
    if (m) fromMessage[opt] = parseInt(m[1], 10);
  }
  // Count every "<text>: <number>%" line so extra/spurious allocation lines in
  // the signed message are rejected, not silently ignored.
  const allocLineCount = (message.match(/^.+: \d+%$/gm) || []).length;

  const keys = Object.keys(allocations);
  const exactOk =
    allocLineCount === keys.length &&
    Object.keys(fromMessage).length === keys.length &&
    keys.every((k) => fromMessage[k] === allocations[k]);

  return proposalOk && walletOk && freshOk && exactOk;
}

async function fetchMoatPoints(
  walletAddress: string,
  contractAddress: string | null
): Promise<number | null> {
  if (!contractAddress) return null;
  try {
    const url = `https://moat-api.fortifi.network/api/moat-points/v2/user/${walletAddress}?contractAddress=${contractAddress}`;
    const mpRes = await fetch(url);
    if (!mpRes.ok) return null;
    const mpData = (await mpRes.json()) as {
      points?: number;
      totalPoints?: number;
    };
    return mpData.points ?? mpData.totalPoints ?? null;
  } catch {
    return null;
  }
}

router.get("/proposals/:id/votes", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const votes = await db
      .select()
      .from(votesTable)
      .where(eq(votesTable.proposalId, id))
      .orderBy(votesTable.createdAt);
    res.json(
      votes.map((v) => ({
        id: v.id,
        proposalId: v.proposalId,
        walletAddress: v.walletAddress,
        choice: v.choice,
        allocations: v.allocations,
        moatPoints: v.moatPoints,
        createdAt: v.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list votes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/proposals/:id/voting-power/:walletAddress", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const walletAddress = req.params.walletAddress;
  if (!isAddress(walletAddress)) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
      .where(eq(proposalsTable.id, id));
    if (rows.length === 0) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    const contractAddress = rows[0].projects.contractAddress;
    const moatPoints = await fetchMoatPoints(walletAddress, contractAddress);
    res.json({ walletAddress, moatPoints, contractAddress });
  } catch (err) {
    req.log.error({ err }, "Failed to get voting power");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/proposals/:id/votes", async (req, res) => {
  const proposalId = parseInt(req.params.id);
  if (isNaN(proposalId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = CastVoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
      .where(eq(proposalsTable.id, proposalId));
    if (rows.length === 0) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    const proposal = rows[0].proposals;
    const contractAddress = rows[0].projects.contractAddress;

    // Voting is open when we are within the proposal's voting window and it
    // has not been cancelled. Status alone is not authoritative because
    // proposals are created as "pending" and never auto-transition.
    const now = Date.now();
    const start = proposal.startDate.getTime();
    const end = proposal.endDate.getTime();
    const isVotingOpen =
      proposal.status !== "cancelled" && now >= start && now <= end;
    if (!isVotingOpen) {
      res.status(400).json({ error: "Voting is closed for this proposal" });
      return;
    }

    // Verify the wallet signature to confirm the voter owns the address.
    if (!isAddress(parsed.data.walletAddress)) {
      res.status(400).json({ error: "Invalid wallet address" });
      return;
    }
    let signatureValid = false;
    try {
      signatureValid = await verifyMessage({
        address: getAddress(parsed.data.walletAddress),
        message: parsed.data.message,
        signature: parsed.data.signature as `0x${string}`,
      });
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      res.status(401).json({ error: "Invalid wallet signature" });
      return;
    }

    // Basic proposals use the fixed FOR / AGAINST / ABSTAIN set and store a
    // single choice. Every other method votes on the admin-defined options as a
    // weighted allocation: the voter spreads percentages across the options and
    // the per-option totals are stored in `allocations`.
    const isBasic = !proposal.options || proposal.options.length === 0;
    let choiceToStore: string | null = null;
    let allocationsToStore: Record<string, number> | null = null;

    if (isBasic) {
      const choice = parsed.data.choice;
      if (!choice || !["for", "against", "abstain"].includes(choice)) {
        res.status(400).json({ error: "Invalid choice for this proposal" });
        return;
      }
      // The signature must be bound to this exact vote (proposal + choice +
      // wallet) and recent, otherwise a valid signature could be replayed.
      if (
        !messageMatchesVote(
          parsed.data.message,
          parsed.data.walletAddress,
          proposalId,
          choice
        )
      ) {
        res
          .status(400)
          .json({ error: "Signed message does not match this vote" });
        return;
      }
      choiceToStore = choice;
    } else {
      const options = proposal.options!;
      const allocations = parsed.data.allocations;
      if (!allocations || typeof allocations !== "object") {
        res
          .status(400)
          .json({ error: "This proposal requires a weighted vote allocation" });
        return;
      }
      const entries = Object.entries(allocations);
      for (const [opt, pct] of entries) {
        if (!options.includes(opt)) {
          res.status(400).json({ error: "Invalid option in allocation" });
          return;
        }
        if (
          typeof pct !== "number" ||
          !Number.isInteger(pct) ||
          pct < 0 ||
          pct > 100
        ) {
          res.status(400).json({
            error: "Allocation percentages must be whole numbers between 0 and 100",
          });
          return;
        }
      }
      // Keep only options the voter actually allocated to.
      const cleaned: Record<string, number> = {};
      for (const [opt, pct] of entries) if (pct > 0) cleaned[opt] = pct;
      const sum = Object.values(cleaned).reduce((acc, pct) => acc + pct, 0);
      if (sum !== 100) {
        res.status(400).json({ error: "Allocations must add up to 100%" });
        return;
      }
      // Bind the signature to the exact allocation, proposal, wallet, recency.
      if (
        !messageMatchesWeightedVote(
          parsed.data.message,
          parsed.data.walletAddress,
          proposalId,
          cleaned,
          options
        )
      ) {
        res
          .status(400)
          .json({ error: "Signed message does not match this vote" });
        return;
      }
      allocationsToStore = cleaned;
    }

    // Fetch the voter's Moat Points for this proposal's Moat.
    const moatPoints = await fetchMoatPoints(
      parsed.data.walletAddress,
      contractAddress
    );

    // Insert with a conflict guard so concurrent requests cannot create a
    // duplicate vote (relies on the unique (proposal_id, wallet_address) index).
    const inserted = await db
      .insert(votesTable)
      .values({
        proposalId,
        walletAddress: parsed.data.walletAddress,
        choice: choiceToStore,
        allocations: allocationsToStore,
        moatPoints,
      })
      .onConflictDoNothing({
        target: [votesTable.proposalId, votesTable.walletAddress],
      })
      .returning();
    if (inserted.length === 0) {
      res.status(400).json({ error: "Already voted on this proposal" });
      return;
    }
    const vote = inserted[0];

    // Update proposal vote counts. The for/against/abstain columns only apply
    // to the basic method; per-option tallies for custom methods are derived
    // from the votes table directly. totalVotes is always incremented.
    const voteUpdate: Partial<typeof proposalsTable.$inferSelect> = {
      totalVotes: proposal.totalVotes + 1,
    };
    if (isBasic) {
      if (choiceToStore === "for")
        voteUpdate.votesFor = proposal.votesFor + 1;
      else if (choiceToStore === "against")
        voteUpdate.votesAgainst = proposal.votesAgainst + 1;
      else voteUpdate.votesAbstain = proposal.votesAbstain + 1;
    }

    await db.update(proposalsTable).set(voteUpdate).where(eq(proposalsTable.id, proposalId));

    res.status(201).json({
      id: vote.id,
      proposalId: vote.proposalId,
      walletAddress: vote.walletAddress,
      choice: vote.choice,
      allocations: vote.allocations,
      moatPoints: vote.moatPoints,
      createdAt: vote.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to cast vote");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
