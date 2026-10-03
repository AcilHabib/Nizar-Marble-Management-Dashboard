import { prisma } from "@workspace/db";
import type { StaffActor } from "../middleware/staff-actor";

export async function recordStaffAction(
  actor: StaffActor,
  action: string,
  detail?: string,
) {
  if (!actor.staffName || actor.staffName === "—") return;
  await prisma.staffAction.create({
    data: {
      staffId: actor.staffId,
      staffName: actor.staffName,
      action,
      detail: detail?.slice(0, 500),
    },
  });
}
