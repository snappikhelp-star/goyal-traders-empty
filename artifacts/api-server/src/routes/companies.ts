import { Router, type IRouter } from "express";
import { eq, desc, or, ilike } from "drizzle-orm";
import { db, companies, insertCompanySchema } from "@workspace/db";
import { isAuthenticated } from "../lib/replitAuth";
import { asyncHandler, HttpError } from "../lib/asyncHandler";

const router: IRouter = Router();
router.use(isAuthenticated);

router.get(
  "/companies",
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const rows = await db
      .select()
      .from(companies)
      .where(search ? or(ilike(companies.name, `%${search}%`), ilike(companies.brand, `%${search}%`)) : undefined)
      .orderBy(desc(companies.createdAt));
    res.json(rows);
  }),
);

router.get(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(companies).where(eq(companies.id, (req.params.id as string)));
    if (!row) throw new HttpError(404, "Company not found");
    res.json(row);
  }),
);

router.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const data = insertCompanySchema.parse(req.body);
    const [row] = await db.insert(companies).values(data).returning();
    res.status(201).json(row);
  }),
);

router.put(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const data = insertCompanySchema.partial().parse(req.body);
    const [row] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, (req.params.id as string)))
      .returning();
    if (!row) throw new HttpError(404, "Company not found");
    res.json(row);
  }),
);

router.delete(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    await db.delete(companies).where(eq(companies.id, (req.params.id as string)));
    res.status(204).end();
  }),
);

export default router;
