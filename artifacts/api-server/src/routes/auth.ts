import { Router, type IRouter } from "express";
import { isAuthenticated } from "../lib/replitAuth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/auth/user", isAuthenticated, async (req, res) => {
  const claims = (req.user as any).claims;
  const [user] = await db.select().from(users).where(eq(users.id, claims.sub));
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.json(user);
});

export default router;
