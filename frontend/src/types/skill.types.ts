import type { SkillStatus } from './enums';

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  skillCount: number;
  createdAt: string;
}

export interface SkillCategoryRequest {
  name: string;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  status: SkillStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillRequest {
  name: string;
  description?: string;
  categoryId: string;
  tags?: string[];
}

