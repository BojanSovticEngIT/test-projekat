import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import { ConfirmDialog } from '../../components';
import { useLatestValidatedRevision, useRestoreLatestValidated } from '@features/employeeSkill/employeeSkillApi';
import { useToast } from '../../lib/ToastProvider';
import type { EmployeeSkill, EmployeeSkillRevision } from '../../types/employeeSkill.types';

const sameNumber = (a?: number | null, b?: number | null): boolean =>
  a == null || b == null ? a == b : Number(a) === Number(b);

const sameInstant = (a?: string | null, b?: string | null): boolean =>
  a == null || b == null ? a == b : new Date(a).getTime() === new Date(b).getTime();

/** True when any stateful field of the live skill differs from the revision (lastUpdatedDate is bookkeeping only). */
export const differsFromRevision = (skill: EmployeeSkill, revision: EmployeeSkillRevision): boolean =>
  skill.validationStatus !== revision.validationStatus ||
  !sameNumber(skill.selfAssessedLevel, revision.selfAssessedLevel) ||
  !sameNumber(skill.managerValidatedLevel, revision.managerValidatedLevel) ||
  !sameNumber(skill.yearsOfExperience, revision.yearsOfExperience) ||
  (skill.lastUsedDate ?? null) !== (revision.lastUsedDate ?? null) ||
  (skill.employeeComment ?? null) !== (revision.employeeComment ?? null) ||
  (skill.managerComment ?? null) !== (revision.managerComment ?? null) ||
  !sameInstant(skill.lastValidatedDate, revision.lastValidatedDate);

interface RestoreLatestValidatedActionProps {
  skill: EmployeeSkill;
}

/** Rendered only for rows the user may already edit; hidden when no validated revision exists or nothing differs. */
const RestoreLatestValidatedAction = ({ skill }: RestoreLatestValidatedActionProps): JSX.Element | null => {
  const { data: revision } = useLatestValidatedRevision(skill.id);
  const restore = useRestoreLatestValidated();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  if (!revision || !differsFromRevision(skill, revision)) {
    return null;
  }

  const handleConfirm = async () => {
    try {
      await restore.mutateAsync(skill.id);
      showToast('Latest validated version restored');
    } catch {
      showToast('Failed to restore latest validated version', 'error');
    } finally {
      setOpen(false);
    }
  };

  return (
    <>
      <Tooltip title="Restore latest validated version">
        <IconButton size="small" aria-label="Restore latest validated version" onClick={() => setOpen(true)}>
          <RestoreOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <ConfirmDialog
        open={open}
        title="Restore latest validated version"
        message={`Replace the current values of "${skill.skillName}" with the latest validated version (v${revision.version})? Your unsaved changes to this skill will be overwritten.`}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        loading={restore.isPending}
        confirmLabel="Restore"
      />
    </>
  );
};

export default RestoreLatestValidatedAction;
