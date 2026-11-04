import type { ChipProps } from '@mui/material';
import { Chip } from '@mui/material';
import { EmploymentStatus, SkillStatus, ValidationRequestStatus, ValidationStatus } from '../../types/enums';

type StatusValue = SkillStatus | ValidationStatus | ValidationRequestStatus | EmploymentStatus | string;

const COLOR_MAP: Record<string, ChipProps['color']> = Object.assign(
  {},
  {
    [SkillStatus.ACTIVE]: 'success',
    [SkillStatus.INACTIVE]: 'default',
    [SkillStatus.DEPRECATED]: 'warning'
  },
  {
    [ValidationStatus.DRAFT]: 'default',
    [ValidationStatus.SUBMITTED]: 'info',
    [ValidationStatus.VALIDATED]: 'success',
    [ValidationStatus.REJECTED]: 'error',
    [ValidationStatus.REOPENED_FOR_EDIT]: 'warning',
    [ValidationStatus.ARCHIVED]: 'default'
  },
  {
    [ValidationRequestStatus.SUBMITTED]: 'info',
    [ValidationRequestStatus.APPROVED]: 'success',
    [ValidationRequestStatus.REJECTED]: 'error',
    [ValidationRequestStatus.CANCELLED]: 'default'
  },
  {
    [EmploymentStatus.ACTIVE]: 'success',
    [EmploymentStatus.ON_LEAVE]: 'warning',
    [EmploymentStatus.TERMINATED]: 'default'
  },
  {
    IN_PROGRESS: 'info',
    ON_HOLD: 'warning',
    COMPLETED: 'success',
    CANCELLED: 'default',
    DELETED: 'default'
  }
);

const formatLabel = (value: string): string =>
  value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

interface StatusChipProps {
  status: StatusValue;
  size?: ChipProps['size'];
  label?: string;
}

const StatusChip = ({ status, size = 'small', label }: StatusChipProps): JSX.Element => (
  <Chip label={label ?? formatLabel(String(status))} color={COLOR_MAP[String(status)] ?? 'default'} size={size} />
);

export default StatusChip;
