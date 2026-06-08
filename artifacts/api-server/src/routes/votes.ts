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

    // The signature must be bound to this exact vote (proposal + choice +
    // wallet) and recent, otherwise a valid signature could be replayed.
    if (
      !messageMatchesVote(
        parsed.data.message,
        parsed.data.walletAddress,
        proposalId,
        parsed.data.choice
      )
    ) {
      res
        .status(400)
        .json({ error: "Signed message does not match this vote" });
      return;
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
        choice: parsed.data.choice,
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

    // Update proposal vote counts
    const voteUpdate: Partial<typeof proposalsTable.$inferSelect> = {
      totalVotes: proposal.totalVotes + 1,
    };
    if (parsed.data.choice === "for") voteUpdate.votesFor = proposal.votesFor + 1;
    else if (parsed.data.choice === "against")
      voteUpdate.votesAgainst = proposal.votesAgainst + 1;
    else voteUpdate.votesAbstain = proposal.votesAbstain + 1;

    await db.update(proposalsTable).set(voteUpdate).where(eq(proposalsTable.id, proposalId));

    res.status(201).json({
      id: vote.id,
      proposalId: vote.proposalId,
      walletAddress: vote.walletAddress,
      choice: vote.choice,
      moatPoints: vote.moatPoints,
      createdAt: vote.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to cast vote");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
