import type { ChipProps } from '@mui/material';
import { Chip } from '@mui/material';
import { KnowledgeLevel } from '../../types/enums';

export const LEVEL_LABEL: Record<number, string> = {
  [KnowledgeLevel.BEGINNER]: 'Beginner',
  [KnowledgeLevel.INTERMEDIATE]: 'Intermediate',
  [KnowledgeLevel.EXPERIENCED]: 'Experienced',
  [KnowledgeLevel.ADVANCED]: 'Advanced',
  [KnowledgeLevel.MASTER]: 'Master'
};

const LEVEL_COLOR: Record<number, ChipProps['color']> = {
  [KnowledgeLevel.BEGINNER]: 'default',
  [KnowledgeLevel.INTERMEDIATE]: 'info',
  [KnowledgeLevel.EXPERIENCED]: 'primary',
  [KnowledgeLevel.ADVANCED]: 'secondary',
  [KnowledgeLevel.MASTER]: 'success'
};

interface SkillLevelBadgeProps {
  level: number;
  size?: ChipProps['size'];
}

const SkillLevelBadge = ({ level, size = 'small' }: SkillLevelBadgeProps): JSX.Element => (
  <Chip label={`${level} — ${LEVEL_LABEL[level] ?? String(level)}`} color={LEVEL_COLOR[level] ?? 'default'} size={size} />
);

export default SkillLevelBadge;
