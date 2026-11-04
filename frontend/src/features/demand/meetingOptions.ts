import { UserRole } from '../../types/enums';
import { DEMAND_MOCKS_ENABLED } from './mockMode';

// Roles the backend offers as meeting participants (MeetingService.MEETING_ROLES). They may open My meetings, which
// the backend limits to the signed-in user's own meetings. It gives no access to demands or to any meeting changes.
export const MEETING_PARTICIPANT_ROLES: UserRole[] = [
  UserRole.LINE_MANAGER,
  UserRole.HR_BUSINESS_PARTNER,
  UserRole.HR,
  UserRole.PMO
];

// Module 3 owned reference data mirroring the PoC. MEETING_USERS is the mock-mode directory only. The real
// directory comes from GET /api/demands/meeting-users (useMeetingUsers).
export const MEETING_KINDS = ['Internal interview', 'Technical interview', 'Client interview', 'Other meeting'] as const;

export interface MeetingUser {
  id: string;
  name: string;
  roleLabel: string;
}

export const MEETING_USERS: MeetingUser[] = [
  { id: 'bojan', name: 'Bojan Ilić', roleLabel: 'Line manager' },
  { id: 'ivana', name: 'Ivana Đorđević', roleLabel: 'Line manager' },
  { id: 'jelena', name: 'Jelena Marković', roleLabel: 'HR BP / Recruiter' },
  { id: 'stefan', name: 'Stefan Jovanović', roleLabel: 'HR BP / Recruiter' },
  { id: 'dragan', name: 'Dragan Nikolić', roleLabel: 'Management' }
];

// DEMO ONLY: links a signed-in username to a person of the mock user list above, so a line manager or HR BP can be a
// meeting participant. Module 1 provides this link once it is integrated.
const PARTICIPANT_BY_USERNAME: Record<string, string> = {
  manager: 'bojan',
  manager2: 'ivana',
  hrbp: 'jelena',
  'hrbp.user': 'jelena'
};

export const participantIdForUser = (username?: string): string | undefined =>
  username ? PARTICIPANT_BY_USERNAME[username] : undefined;

// The participant id the signed-in user acts as. Mock mode: the demo mapping or "View as (mock)". Real mode: the
// user's own id from the login response, which is the id the backend stores for meeting participants.
export const actingParticipantId = (user: { id: string; username: string } | null | undefined, viewAs?: string): string | undefined => {
  if (!user) return undefined;
  return DEMAND_MOCKS_ENABLED ? viewAs ?? participantIdForUser(user.username) : user.id;
};

export const parseExternalNames = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// A real calendar date. "2026-02-31" is rejected instead of rolling over to March.
export const isValidDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const isValidDateTime = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
  isValidDate(value.slice(0, 10)) &&
  Number(value.slice(11, 13)) <= 23 &&
  Number(value.slice(14, 16)) <= 59;
