import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { proposalsTable, projectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  CreateProposalBody,
  UpdateProposalBody,
  ListProposalsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/proposals/summary", async (req, res) => {
  try {
    const proposals = await db.select().from(proposalsTable);
    const summary = {
      total: proposals.length,
      active: proposals.filter((p) => p.status === "active").length,
      passed: proposals.filter((p) => p.status === "passed").length,
      failed: proposals.filter((p) => p.status === "failed").length,
      pending: proposals.filter((p) => p.status === "pending").length,
      cancelled: proposals.filter((p) => p.status === "cancelled").length,
    };
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get proposals summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/proposals", async (req, res) => {
  const parsed = ListProposalsQueryParams.safeParse(req.query);
  try {
    const conditions = [];
    if (parsed.success && parsed.data.projectId != null) {
      conditions.push(eq(proposalsTable.projectId, parsed.data.projectId));
    }
    if (parsed.success && parsed.data.status != null) {
      conditions.push(eq(proposalsTable.status, parsed.data.status));
    }

    const rows =
      conditions.length > 0
        ? await db
            .select()
            .from(proposalsTable)
            .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
            .where(and(...conditions))
            .orderBy(proposalsTable.createdAt)
        : await db
            .select()
            .from(proposalsTable)
            .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
            .orderBy(proposalsTable.createdAt);

    res.json(
      rows.map(({ proposals, projects }) => ({
        id: proposals.id,
        title: proposals.title,
        description: proposals.description,
        projectId: proposals.projectId,
        projectName: projects.name,
        status: proposals.status,
        createdBy: proposals.createdBy,
        quorumType: proposals.quorumType,
        quorumThreshold: proposals.quorumThreshold,
        startDate: proposals.startDate.toISOString(),
        endDate: proposals.endDate.toISOString(),
        createdAt: proposals.createdAt.toISOString(),
        votesFor: proposals.votesFor,
        votesAgainst: proposals.votesAgainst,
        votesAbstain: proposals.votesAbstain,
        totalVotes: proposals.totalVotes,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list proposals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/proposals", async (req, res) => {
  const parsed = CreateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, parsed.data.projectId));
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [proposal] = await db
      .insert(proposalsTable)
      .values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        projectId: parsed.data.projectId,
        status: "pending",
        createdBy: parsed.data.createdBy,
        quorumType: parsed.data.quorumType,
        quorumThreshold: parsed.data.quorumThreshold,
        startDate: new Date(parsed.data.startDate),
        endDate: new Date(parsed.data.endDate),
      })
      .returning();

    // Update project totals
    await db
      .update(projectsTable)
      .set({ totalProposals: project.totalProposals + 1 })
      .where(eq(projectsTable.id, project.id));

    res.status(201).json({
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      projectId: proposal.projectId,
      projectName: project.name,
      status: proposal.status,
      createdBy: proposal.createdBy,
      quorumType: proposal.quorumType,
      quorumThreshold: proposal.quorumThreshold,
      startDate: proposal.startDate.toISOString(),
      endDate: proposal.endDate.toISOString(),
      createdAt: proposal.createdAt.toISOString(),
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      votesAbstain: proposal.votesAbstain,
      totalVotes: proposal.totalVotes,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/proposals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
      .where(eq(proposalsTable.id, id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { proposals, projects } = rows[0];

    res.json({
      id: proposals.id,
      title: proposals.title,
      description: proposals.description,
      projectId: proposals.projectId,
      projectName: projects.name,
      contractAddress: projects.contractAddress,
      status: proposals.status,
      createdBy: proposals.createdBy,
      quorumType: proposals.quorumType,
      quorumThreshold: proposals.quorumThreshold,
      startDate: proposals.startDate.toISOString(),
      endDate: proposals.endDate.toISOString(),
      createdAt: proposals.createdAt.toISOString(),
      votesFor: proposals.votesFor,
      votesAgainst: proposals.votesAgainst,
      votesAbstain: proposals.votesAbstain,
      totalVotes: proposals.totalVotes,
      votes: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/proposals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateProposalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
      .where(eq(proposalsTable.id, id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updates: Partial<typeof proposalsTable.$inferSelect> = {};
    if (parsed.data.status) updates.status = parsed.data.status;
    if (parsed.data.title) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.endDate) updates.endDate = new Date(parsed.data.endDate);

    const [updated] = await db
      .update(proposalsTable)
      .set(updates)
      .where(eq(proposalsTable.id, id))
      .returning();

    const { projects } = rows[0];
    res.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      projectId: updated.projectId,
      projectName: projects.name,
      status: updated.status,
      createdBy: updated.createdBy,
      quorumType: updated.quorumType,
      quorumThreshold: updated.quorumThreshold,
      startDate: updated.startDate.toISOString(),
      endDate: updated.endDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      votesFor: updated.votesFor,
      votesAgainst: updated.votesAgainst,
      votesAbstain: updated.votesAbstain,
      totalVotes: updated.totalVotes,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/proposals/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(proposalsTable)
      .innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id))
      .where(eq(proposalsTable.id, id));

    if (rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [deleted] = await db
      .update(proposalsTable)
      .set({ status: "cancelled" })
      .where(eq(proposalsTable.id, id))
      .returning();

    const { projects } = rows[0];
    res.json({
      id: deleted.id,
      title: deleted.title,
      description: deleted.description,
      projectId: deleted.projectId,
      projectName: projects.name,
      status: deleted.status,
      createdBy: deleted.createdBy,
      quorumType: deleted.quorumType,
      quorumThreshold: deleted.quorumThreshold,
      startDate: deleted.startDate.toISOString(),
      endDate: deleted.endDate.toISOString(),
      createdAt: deleted.createdAt.toISOString(),
      votesFor: deleted.votesFor,
      votesAgainst: deleted.votesAgainst,
      votesAbstain: deleted.votesAbstain,
      totalVotes: deleted.totalVotes,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to delete proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
