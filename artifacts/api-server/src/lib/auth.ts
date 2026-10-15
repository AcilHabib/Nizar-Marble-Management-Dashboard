import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "@workspace/db";

const scryptAsync = promisify(scrypt);

export const ADMIN_USERNAME = "nezzar admin";
const ADMIN_PASSWORD = "Nezar.Admin.123!";
export const SESSION_COOKIE = "nizar_session";
const SESSION_DAYS = 14;

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
    path: "/",
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, saltB64, hashB64] = stored.split("$");
  if (kind !== "scrypt" || !saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = (await scryptAsync(password, salt, expected.length)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureAdminAccount(): Promise<void> {
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await prisma.adminAccount.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: { username: ADMIN_USERNAME, passwordHash },
  });
}

export async function createSession(res: Response, username: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.authSession.create({
    data: {
      tokenHash: tokenHash(token),
      username,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieBase(),
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieBase());
}

export async function readSession(req: Request): Promise<{ username: string } | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: tokenHash(token) },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { username: session.username };
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    await prisma.authSession
      .delete({ where: { tokenHash: tokenHash(token) } })
      .catch(() => undefined);
  }
  clearSessionCookie(res);
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path === "/healthz" || req.path.startsWith("/auth/")) {
    next();
    return;
  }
  try {
    const session = await readSession(req);
    if (!session) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
