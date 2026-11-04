export type EngagementSkillLevel = 'BEGINNER' | 'PRACTITIONER' | 'EXPERT';

export interface EngagementSkill {
  id: string;
  allocationId: string;
  skillId: string;
  skillName: string;
  levelUsed: EngagementSkillLevel;
  primarySkill: boolean;
  recordedById?: string;
  recordedByName?: string;
  recordedAt?: string;
}

export interface EngagementSkillRequest {
  skillId: string;
  levelUsed: EngagementSkillLevel;
  primarySkill: boolean;
}

export const ENGAGEMENT_SKILL_LEVELS: EngagementSkillLevel[] = ['BEGINNER', 'PRACTITIONER', 'EXPERT'];
