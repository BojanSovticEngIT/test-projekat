import { HttpResponse } from 'msw';
import useAuthStore from '@store/authStore';
import { UserRole } from '../types/enums';
import { MEETING_USERS, participantIdForUser } from '../features/demand/meetingOptions';
import type { CandidateStep } from '../types/demand.types';

// DEMO-ONLY authorization for the Module 3 mock API (spec 4.2, R-01 to R-04). It is not production security:
// MSW runs in the browser, so the "session" is the signed-in user of the app store. The only thing a request can
// supply is its bearer token, which must match that session. Actor names and roles in request bodies are never used.

export const VIEW_AS_HEADER = 'x-mock-view-as';

export type DemandCapability = 'READ' | 'MANAGE_DEMAND' | 'ADD_CANDIDATE' | 'ADD_NOTE' | 'MANAGE_FLOW';

const ALL: DemandCapability[] = ['READ', 'MANAGE_DEMAND', 'ADD_CANDIDATE', 'ADD_NOTE', 'MANAGE_FLOW'];

// ADMIN keeps full access for development, as the existing routes and screens already treat it as a demand manager.
// MANAGEMENT keeps the read-only access of the existing Demands screens. Line managers have no entry here: they only
// get what they are entitled to as a meeting participant.
const GRANTS: Partial<Record<UserRole, DemandCapability[]>> = {
  [UserRole.ADMIN]: ALL,
  [UserRole.PMO]: ALL,
  [UserRole.HR_BUSINESS_PARTNER]: ['READ', 'ADD_CANDIDATE', 'ADD_NOTE'],
  [UserRole.MANAGEMENT]: ['READ']
};

export interface DemandActor {
  userId: string;
  username: string;
  role: UserRole;
  // Id of the person in the mock meeting user list that this user is, if any.
  participantId?: string;
  // True when a demand manager uses "View as (mock)". The actor then has participant permissions only.
  impersonating: boolean;
}

const isDemandManagerRole = (role: UserRole): boolean => role === UserRole.ADMIN || role === UserRole.PMO;

export const resolveActor = (request: Request): DemandActor | null => {
  const { token, user } = useAuthStore.getState();
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!bearer || !token || bearer !== token || !user) return null;
  const base = { userId: user.id, username: user.username, role: user.role };
  const viewAs = request.headers.get(VIEW_AS_HEADER);
  if (viewAs && isDemandManagerRole(user.role) && MEETING_USERS.some((person) => person.id === viewAs)) {
    return { ...base, participantId: viewAs, impersonating: true };
  }
  return { ...base, participantId: participantIdForUser(user.username), impersonating: false };
};

export const can = (actor: DemandActor, capability: DemandCapability): boolean =>
  !actor.impersonating && Boolean(GRANTS[actor.role]?.includes(capability));

export const actorName = (actor: DemandActor): string =>
  MEETING_USERS.find((person) => person.id === actor.participantId)?.name ?? actor.username;

// Stable identifier of the author, kept apart from the display name.
export const actorId = (actor: DemandActor): string => (actor.impersonating && actor.participantId ? actor.participantId : actor.userId);

export const isMeetingParticipant = (actor: DemandActor, step: Pick<CandidateStep, 'type' | 'participants'>): boolean =>
  step.type === 'MEETING' &&
  Boolean(actor.participantId) &&
  Boolean(step.participants?.some((person) => !person.external && person.userId === actor.participantId));

export type Access = { actor: DemandActor; denied?: undefined } | { actor?: undefined; denied: Response };

export const denyForbidden = (message = 'You do not have permission to do this.'): Response =>
  HttpResponse.json({ message }, { status: 403 });

// Checked first in every handler, before any lookup or change, so a denied request leaves the state untouched.
export const authorize = (request: Request, capability: DemandCapability): Access => {
  const actor = resolveActor(request);
  if (!actor) return { denied: HttpResponse.json({ message: 'Sign in to continue.' }, { status: 401 }) };
  return can(actor, capability) ? { actor } : { denied: denyForbidden() };
};

// For endpoints a meeting participant may also use. The caller then checks the specific meeting.
export const authorizeOrParticipant = (request: Request, capability: DemandCapability): Access => {
  const actor = resolveActor(request);
  if (!actor) return { denied: HttpResponse.json({ message: 'Sign in to continue.' }, { status: 401 }) };
  return can(actor, capability) || actor.participantId ? { actor } : { denied: denyForbidden() };
};
