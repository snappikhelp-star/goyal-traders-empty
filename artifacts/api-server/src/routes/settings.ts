import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, shopSettings, insertShopSettingsSchema } from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const [row] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
    res.json(row ?? null);
  }),
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const data = insertShopSettingsSchema.partial().parse(req.body);
    const [row] = await db
      .insert(shopSettings)
      .values({ id: 1, ...data })
      .onConflictDoUpdate({
        target: shopSettings.id,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    res.json(row);
  }),
);

export default router;
