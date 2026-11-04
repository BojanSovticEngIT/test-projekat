import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import type { AllocationLifecycleStatus } from '../../types/allocation.types';
import EngagementSkillsPanel from './EngagementSkillsPanel';

interface EngagementSkillsDialogProps {
  open: boolean;
  allocationId?: string;
  employeeName?: string;
  projectName?: string;
  lifecycleStatus?: AllocationLifecycleStatus;
  onClose: () => void;
}

function EngagementSkillsDialog({
  open,
  allocationId,
  employeeName,
  projectName,
  lifecycleStatus,
  onClose
}: EngagementSkillsDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Engagement Skills</DialogTitle>
      <DialogContent>
        <EngagementSkillsPanel
          allocationId={open ? allocationId : undefined}
          employeeName={employeeName}
          projectName={projectName}
          lifecycleStatus={lifecycleStatus}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default EngagementSkillsDialog;
