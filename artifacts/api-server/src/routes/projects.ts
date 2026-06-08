import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, insertProjectSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateProjectBody } from "@workspace/api-zod";

const router: IRouter = Router();

const MOAT_API = "https://moat-api.fortifi.network/api";

router.get("/projects", async (req, res) => {
  try {
    const projects = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    res.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        contractAddress: p.contractAddress,
        description: p.description,
        logoUrl: p.logoUrl,
        totalProposals: p.totalProposals,
        activeProposals: p.activeProposals,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list projects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/projects", async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [project] = await db
      .insert(projectsTable)
      .values({
        name: parsed.data.name,
        contractAddress: parsed.data.contractAddress,
        description: parsed.data.description ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
      })
      .returning();
    res.status(201).json({
      id: project.id,
      name: project.name,
      contractAddress: project.contractAddress,
      description: project.description,
      logoUrl: project.logoUrl,
      totalProposals: project.totalProposals,
      activeProposals: project.activeProposals,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      id: project.id,
      name: project.name,
      contractAddress: project.contractAddress,
      description: project.description,
      logoUrl: project.logoUrl,
      totalProposals: project.totalProposals,
      activeProposals: project.activeProposals,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get project");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/projects/:id/leaderboard", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id));
    if (!project) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const url = `${MOAT_API}/moat-points/all?contractAddress=${project.contractAddress}`;
    const response = await fetch(url);
    if (!response.ok) {
      // Return empty leaderboard if Moat API is unavailable
      res.json([]);
      return;
    }
    const data = (await response.json()) as Array<{
      walletAddress: string;
      contractAddress: string;
      points: number;
      lastUpdated: number;
    }>;
    const entries = data
      .sort((a, b) => b.points - a.points)
      .slice(0, 100)
      .map((entry, i) => ({
        walletAddress: entry.walletAddress,
        points: entry.points,
        rank: i + 1,
      }));
    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "Failed to get leaderboard");
    res.json([]);
  }
});

router.get("/verified-moats", async (req, res) => {
  try {
    const response = await fetch(`${MOAT_API}/moat-config`);
    if (!response.ok) {
      res.status(502).json({ error: "Failed to reach Moats API" });
      return;
    }
    const data = (await response.json()) as Array<{
      _id: string;
      contractAddress: string;
      network: string;
      status: string;
      rewardStrategy?: string;
      tags?: Array<{ name: string; color: string }>;
      rewardTokens?: Array<{ name: string; symbol: string }>;
    }>;
    const verified = data
      .filter((m) => m.status === "Verified")
      .map((m) => {
        const tokenName = m.rewardTokens?.[0]?.name ?? null;
        const shortAddr = `${m.contractAddress.slice(0, 6)}...${m.contractAddress.slice(-4)}`;
        return {
          contractAddress: m.contractAddress,
          name: tokenName ?? shortAddr,
          network: m.network,
          description: m.rewardStrategy ?? null,
          tags: (m.tags ?? []).map((t) => ({ name: t.name, color: t.color })),
        };
      });
    res.json(verified);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch verified moats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
