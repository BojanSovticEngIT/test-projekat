import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import AllocationHistoryList from './AllocationHistoryList';

interface AllocationHistoryDialogProps {
  open: boolean;
  allocationId?: string;
  title?: string;
  onClose: () => void;
}

const AllocationHistoryDialog = ({
  open,
  allocationId,
  title = 'Allocation History',
  onClose
}: AllocationHistoryDialogProps): JSX.Element => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <AllocationHistoryList allocationId={open ? allocationId : undefined} />
    </DialogContent>
  </Dialog>
);

export default AllocationHistoryDialog;
