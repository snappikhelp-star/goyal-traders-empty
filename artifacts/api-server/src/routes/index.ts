import { Router, type IRouter } from "express";
import type { ErrorRequestHandler } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import customersRouter from "./customers";
import productsRouter from "./products";
import billsRouter from "./bills";
import paymentsRouter from "./payments";
import companiesRouter from "./companies";
import purchasesRouter from "./purchases";
import settingsRouter from "./settings";
import dashboardRouter from "./dashboard";
import { HttpError } from "../lib/asyncHandler";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(billsRouter);
router.use(paymentsRouter);
router.use(companiesRouter);
router.use(purchasesRouter);
router.use(settingsRouter);
router.use(dashboardRouter);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err?.name === "ZodError") {
    return res.status(400).json({ message: "Validation failed", issues: err.issues });
  }
  logger.error({ err }, "Unhandled API error");
  return res.status(500).json({ message: "Internal server error" });
};

export default router;
