import type { Request, Response, NextFunction } from "express";
import { prisma } from "@workspace/db";

export type StaffActor = {
  staffId?: string;
  staffName: string;
};

declare global {
  namespace Express {
    interface Request {
      staffActor?: StaffActor;
    }
  }
}

export async function staffActorMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const staffId = req.get("X-Staff-Id")?.trim() || undefined;
    let staffName = "";
    if (staffId) {
      const member = await prisma.staffMember.findUnique({
        where: { id: staffId },
        select: { name: true },
      });
      staffName = member?.name ?? "";
    }
    req.staffActor = {
      staffId,
      staffName: staffName || "—",
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function actorFromRequest(req: Request): StaffActor {
  return req.staffActor ?? { staffName: "—" };
}
