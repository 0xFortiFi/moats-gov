import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { votesTable, proposalsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CastVoteBody } from "@workspace/api-zod";

const router: IRouter = Router();

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
    const [proposal] = await db
      .select()
      .from(proposalsTable)
      .where(eq(proposalsTable.id, proposalId));
    if (!proposal) {
      res.status(404).json({ error: "Proposal not found" });
      return;
    }
    if (proposal.status !== "active") {
      res.status(400).json({ error: "Proposal is not active" });
      return;
    }

    // Check for duplicate vote
    const existing = await db
      .select()
      .from(votesTable)
      .where(
        and(
          eq(votesTable.proposalId, proposalId),
          eq(votesTable.walletAddress, parsed.data.walletAddress)
        )
      );
    if (existing.length > 0) {
      res.status(400).json({ error: "Already voted on this proposal" });
      return;
    }

    // Fetch Moat Points for voter
    let moatPoints: number | null = null;
    try {
      const mpRes = await fetch(
        `https://moat-api.fortifi.network/api/moat-points/v2/user/${parsed.data.walletAddress}`
      );
      if (mpRes.ok) {
        const mpData = (await mpRes.json()) as { points?: number; totalPoints?: number };
        moatPoints = mpData.points ?? mpData.totalPoints ?? null;
      }
    } catch {
      // silently ignore
    }

    const [vote] = await db
      .insert(votesTable)
      .values({
        proposalId,
        walletAddress: parsed.data.walletAddress,
        choice: parsed.data.choice,
        moatPoints,
      })
      .returning();

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
