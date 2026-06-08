import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { AddAdminBody, ListAdminsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admins", async (req, res) => {
  const parsed = ListAdminsQueryParams.safeParse(req.query);
  try {
    const admins =
      parsed.success && parsed.data.projectId != null
        ? await db
            .select()
            .from(adminsTable)
            .where(eq(adminsTable.projectId, parsed.data.projectId))
            .orderBy(adminsTable.createdAt)
        : await db.select().from(adminsTable).orderBy(adminsTable.createdAt);

    res.json(
      admins.map((a) => ({
        id: a.id,
        projectId: a.projectId,
        walletAddress: a.walletAddress,
        createdAt: a.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list admins");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admins", async (req, res) => {
  const parsed = AddAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const [admin] = await db
      .insert(adminsTable)
      .values({
        projectId: parsed.data.projectId,
        walletAddress: parsed.data.walletAddress,
      })
      .returning();
    res.status(201).json({
      id: admin.id,
      projectId: admin.projectId,
      walletAddress: admin.walletAddress,
      createdAt: admin.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add admin");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/admins/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [admin] = await db.delete(adminsTable).where(eq(adminsTable.id, id)).returning();
    if (!admin) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      id: admin.id,
      projectId: admin.projectId,
      walletAddress: admin.walletAddress,
      createdAt: admin.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to remove admin");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
