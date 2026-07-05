import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { projectsTable, insertProjectSchema } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateProjectBody } from "@workspace/api-zod";

const router: IRouter = Router();

const MOAT_API = "https://moat-api.fortifi.network/api";

router.get("/projects", async (req, res) => {
  try {
    // Auto-sync verified moats into the projects table so every moat appears as a project.
    // Uses the same in-memory cache as /verified-moats, so no extra RPC cost on cache hits.
    try {
      const moats = await getVerifiedMoats();
      if (moats.length > 0) {
        await db
          .insert(projectsTable)
          .values(
            moats.map((m) => ({
              name: m.name,
              contractAddress: m.contractAddress,
              description: m.description ?? null,
              logoUrl: m.logoUrl ?? null,
            }))
          )
          .onConflictDoUpdate({
            target: projectsTable.contractAddress,
            set: {
              name: sql`excluded.name`,
              description: sql`excluded.description`,
              logoUrl: sql`coalesce(excluded.logo_url, ${projectsTable.logoUrl})`,
            },
          });
      }
    } catch (syncErr) {
      // Non-fatal — still return whatever is in the DB
      req.log.warn({ err: syncErr }, "Could not sync verified moats");
    }

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
      address?: string;
      walletAddress?: string;
      points: number;
    }>;
    const entries = data
      .sort((a, b) => b.points - a.points)
      .slice(0, 100)
      .map((entry, i) => ({
        walletAddress: entry.walletAddress ?? entry.address ?? "",
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

async function resolveMoat(moatAddr: string): Promise<{ name: string | null; stakingToken: string | null }> {
  try {
    const stakingRaw = await ethCall(moatAddr, "0x72f702f3"); // stakingToken()
    if (!stakingRaw || stakingRaw === "0x") return { name: null, stakingToken: null };
    const tokenAddr = "0x" + stakingRaw.slice(-40);
    const nameRaw = await ethCall(tokenAddr, "0x06fdde03"); // name()
    const name = decodeAbiString(nameRaw);
    return { name: name ? `${name} Moat` : null, stakingToken: tokenAddr };
  } catch {
    return { name: null, stakingToken: null };
  }
}

// Resolve a token's logo via DexScreener — picks the image from the highest-liquidity pair.
// This is the same source pro.moats.app uses for moat logos.
async function resolveTokenLogo(tokenAddr: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddr}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{ info?: { imageUrl?: string }; liquidity?: { usd?: number } }>;
    };
    let best: { liq: number; url: string } | null = null;
    for (const p of data.pairs ?? []) {
      const url = p.info?.imageUrl;
      const liq = p.liquidity?.usd ?? 0;
      if (url && (!best || liq > best.liq)) best = { liq, url };
    }
    return best?.url ?? null;
  } catch {
    return null;
  }
}

type VerifiedMoat = {
  contractAddress: string;
  name: string;
  network: string;
  description: string | null;
  logoUrl: string | null;
  tags: Array<{ name: string; color: string }>;
};

// Manual logo overrides (lowercase contract address → URL). Takes priority over DexScreener.
const LOGO_OVERRIDES: Record<string, string> = {
  // HEFE Moat
  "0xcf65744c955a292d11de2a4184e9fabedbfc7b40": "https://i.ibb.co/HTyxbsq3/Hefelogo-new.png",
  // SEEDS Moat
  "0xec7a708c9a9ac691d5e8be056bbd5c8251f003ea": "https://i.ibb.co/0RRDSYjG/Seeds.png",
  // Red Popcorn Moat
  "0xbc6c01957d542537f040adc1df57af87cf84671b": "https://i.ibb.co/SD12F0Dv/redpopcorn-pfp.jpg",
  // Discloser Moat
  "0xb3fcc83669d96934dee361e897f9ec33c911deaf": "https://i.ibb.co/BKZRnGSK/discloser.jpg",
  // Pharaoh Volatile - WAVAX/hCASH Moat
  "0x501f6e7bec3db63d8dacbc9fa0ce42d5d2329d53": "https://i.ibb.co/LXFYNcJ6/hashcashclub.png",
};

// 10-minute in-memory cache
let verifiedMoatsCache: { data: VerifiedMoat[]; expiresAt: number } | null = null;

async function getVerifiedMoats(): Promise<VerifiedMoat[]> {
  if (verifiedMoatsCache && Date.now() < verifiedMoatsCache.expiresAt) {
    return verifiedMoatsCache.data;
  }

  const response = await fetch(`${MOAT_API}/moat-config`);
  if (!response.ok) throw new Error("Failed to reach Moats API");

  const data = (await response.json()) as Array<{
    contractAddress: string;
    network: string;
    status: string;
    rewardStrategy?: string;
    tags?: Array<{ name: string; color: string }>;
  }>;

  const verified = data.filter((m) => m.status === "Verified");
  const resolved = await Promise.all(verified.map((m) => resolveMoat(m.contractAddress)));
  const logos = await Promise.all(
    resolved.map((r) => (r.stakingToken ? resolveTokenLogo(r.stakingToken) : Promise.resolve(null))),
  );

  const result: VerifiedMoat[] = verified.map((m, i) => {
    const shortAddr = `${m.contractAddress.slice(0, 6)}...${m.contractAddress.slice(-4)}`;
    return {
      contractAddress: m.contractAddress,
      name: resolved[i].name ?? `Moat ${shortAddr}`,
      network: m.network,
      description: m.rewardStrategy ?? null,
      logoUrl: LOGO_OVERRIDES[m.contractAddress.toLowerCase()] ?? logos[i],
      tags: (m.tags ?? []).map((t) => ({ name: t.name, color: t.color })),
    };
  });

  verifiedMoatsCache = { data: result, expiresAt: Date.now() + 10 * 60 * 1000 };
  return result;
}

router.get("/verified-moats", async (req, res) => {
  try {
    const result = await getVerifiedMoats();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch verified moats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
