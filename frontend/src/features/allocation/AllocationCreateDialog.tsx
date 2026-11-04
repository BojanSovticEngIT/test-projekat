import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import AllocationCreateForm from './AllocationCreateForm';

interface AllocationCreateDialogProps {
  open: boolean;
  onClose: () => void;
  defaultEmployeeId?: string;
  defaultProjectId?: string;
}

const AllocationCreateDialog = ({
  open,
  onClose,
  defaultEmployeeId,
  defaultProjectId
}: AllocationCreateDialogProps): JSX.Element => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Create Allocation</DialogTitle>
    <DialogContent>
      <AllocationCreateForm
        onDone={onClose}
        onCancel={onClose}
        defaultEmployeeId={defaultEmployeeId}
        defaultProjectId={defaultProjectId}
      />
    </DialogContent>
  </Dialog>
);

export default AllocationCreateDialog;
