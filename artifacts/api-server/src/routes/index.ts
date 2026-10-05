import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marbleKindsRouter from "./marble-kinds";
import suppliersRouter from "./suppliers";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import staffRouter from "./staff";
import dashboardRouter from "./dashboard";
import financeRouter from "./finance";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/uploads", uploadsRouter);
router.use("/suppliers", suppliersRouter);
router.use("/customers", customersRouter);
router.use("/marble-kinds", marbleKindsRouter);
router.use("/orders", ordersRouter);
router.use("/staff", staffRouter);
router.use("/dashboard", dashboardRouter);
router.use("/finance", financeRouter);

export default router;
