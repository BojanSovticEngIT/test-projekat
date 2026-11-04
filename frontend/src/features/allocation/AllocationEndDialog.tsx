import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import type { Allocation } from '../../types/allocation.types';
import AllocationEndFlow, { type AllocationEndStep } from './AllocationEndFlow';

interface AllocationEndDialogProps {
  open: boolean;
  allocation: Allocation | null;
  onClose: () => void;
}

const AllocationEndDialog = ({ open, allocation, onClose }: AllocationEndDialogProps): JSX.Element => {
  const [step, setStep] = useState<AllocationEndStep>('skills');

  useEffect(() => {
    if (open) {
      setStep('skills');
    }
  }, [open, allocation?.id]);

  if (!allocation) {
    return <></>;
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={step === 'skills' ? 'md' : 'sm'}>
      <DialogTitle>{step === 'skills' ? 'Confirm Engagement Skills' : 'End Allocation'}</DialogTitle>
      <DialogContent>
        <AllocationEndFlow
          key={allocation.id}
          allocation={allocation}
          onDone={onClose}
          onCancel={onClose}
          onStepChange={setStep}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AllocationEndDialog;
