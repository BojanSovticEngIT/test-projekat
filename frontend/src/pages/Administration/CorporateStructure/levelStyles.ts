import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { engColors } from '../../../theme/theme';

export const CORPORATE_STRUCTURE_PATH = '/administration/corporate-structure';

// Same blue at decreasing intensity: darker/heavier = higher in the hierarchy
export const levelChipSx = (level: number): SxProps<Theme> => {
  if (level === 1) return { bgcolor: engColors.blue, color: engColors.white };
  if (level === 2) return { bgcolor: alpha(engColors.blue, 0.12), color: engColors.blue };
  return { bgcolor: 'transparent', color: 'text.secondary', border: `1px solid ${alpha(engColors.blue, 0.4)}` };
};
