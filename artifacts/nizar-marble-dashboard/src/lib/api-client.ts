export type ApiStaffActor = {
  staffId?: string;
  staffName: string;
};

let actor: ApiStaffActor = { staffName: '—' };

export function setApiStaffActor(next: ApiStaffActor) {
  actor = next;
}

export function getApiStaffActor(): ApiStaffActor {
  return actor;
}

/** HTTP headers must be ISO-8859-1; staff names are resolved on the API from X-Staff-Id. */
export function staffActorHeaders(): Record<string, string> {
  if (!actor.staffId) return {};
  return { 'X-Staff-Id': actor.staffId };
}
