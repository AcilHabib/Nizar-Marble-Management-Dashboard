import { Router, type IRouter } from "express";
import {
  ADMIN_USERNAME,
  createSession,
  destroySession,
  ensureAdminAccount,
  readSession,
  verifyPassword,
} from "../lib/auth";
import { prisma } from "@workspace/db";

const router: IRouter = Router();

router.post("/login", async (req, res, next) => {
  try {
    await ensureAdminAccount();
    const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const account = await prisma.adminAccount.findUnique({ where: { username } });
    const valid = account ? await verifyPassword(password, account.passwordHash) : false;
    if (!account || !valid || username !== ADMIN_USERNAME) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }
    await createSession(res, account.username);
    res.json({ username: account.username });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await destroySession(req, res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const session = await readSession(req);
    if (!session) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ username: session.username });
  } catch (err) {
    next(err);
  }
});

export default router;
