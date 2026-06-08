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

// ── On-chain name resolution ──────────────────────────────────────────────────
const AVAX_RPC = "https://api.avax.network/ext/bc/C/rpc";

async function ethCall(to: string, data: string): Promise<string> {
  const res = await fetch(AVAX_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  return json.result ?? "0x";
}

function decodeAbiString(hex: string): string | null {
  if (!hex || hex === "0x") return null;
  try {
    const h = hex.slice(2);
    const len = parseInt(h.slice(64, 128), 16);
    return Buffer.from(h.slice(128, 128 + len * 2), "hex").toString("utf8").trim() || null;
  } catch {
    return null;
  }
}

async function resolveMoatName(moatAddr: string): Promise<string | null> {
  try {
    const stakingRaw = await ethCall(moatAddr, "0x72f702f3"); // stakingToken()
    if (!stakingRaw || stakingRaw === "0x") return null;
    const tokenAddr = "0x" + stakingRaw.slice(-40);
    const nameRaw = await ethCall(tokenAddr, "0x06fdde03"); // name()
    const name = decodeAbiString(nameRaw);
    return name ? `${name} Moat` : null;
  } catch {
    return null;
  }
}

// 10-minute in-memory cache
let verifiedMoatsCache: { data: unknown[]; expiresAt: number } | null = null;

router.get("/verified-moats", async (req, res) => {
  try {
    if (verifiedMoatsCache && Date.now() < verifiedMoatsCache.expiresAt) {
      res.json(verifiedMoatsCache.data);
      return;
    }

    const response = await fetch(`${MOAT_API}/moat-config`);
    if (!response.ok) {
      res.status(502).json({ error: "Failed to reach Moats API" });
      return;
    }
    const data = (await response.json()) as Array<{
      contractAddress: string;
      network: string;
      status: string;
      rewardStrategy?: string;
      tags?: Array<{ name: string; color: string }>;
    }>;

    const verified = data.filter((m) => m.status === "Verified");

    // Resolve all moat names on-chain in parallel
    const names = await Promise.all(verified.map((m) => resolveMoatName(m.contractAddress)));

    const result = verified.map((m, i) => {
      const shortAddr = `${m.contractAddress.slice(0, 6)}...${m.contractAddress.slice(-4)}`;
      return {
        contractAddress: m.contractAddress,
        name: names[i] ?? `Moat ${shortAddr}`,
        network: m.network,
        description: m.rewardStrategy ?? null,
        tags: (m.tags ?? []).map((t) => ({ name: t.name, color: t.color })),
      };
    });

    verifiedMoatsCache = { data: result, expiresAt: Date.now() + 10 * 60 * 1000 };
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch verified moats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
