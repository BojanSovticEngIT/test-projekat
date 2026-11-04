import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Paper,
  Stack,
  Typography
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog, StatusChip, WorkforcePageHeader } from '../../components';
import { CommentField, LevelSelect } from '../../components/FormFields';
import {
  useApproveItem,
  useRejectItem,
  useRevokeValidationRequest,
  useValidationRequest
} from '@features/validation/validationApi';
import { useEmployeeSkills } from '@features/employeeSkill/employeeSkillApi';
import ValidationItemCard from '@features/validation/ValidationItemCard';
import { formatDate } from '@features/demand/demandFormat';
import { useAuthStore } from '@store/authStore';
import { useToast } from '../../lib/ToastProvider';
import { ValidationRequestStatus, ValidationRequestType } from '../../types/enums';
import type { ValidationRequestItem } from '../../types/validation.types';

type ActionType = 'approve' | 'reject';

interface ActionState {
  itemId: string;
  type: ActionType;
  level: number | '';
  comment: string;
  errors: {
    level?: string;
    comment?: string;
  };
}

const isValidLevel = (level: number): boolean => Number.isInteger(level) && level >= 1 && level <= 5;

const createActionState = (item: ValidationRequestItem, type: ActionType, isDeletion: boolean): ActionState => ({
  itemId: item.id,
  type,
  level: type === 'approve' && !isDeletion && isValidLevel(item.selfAssessedLevel) ? item.selfAssessedLevel : '',
  comment: '',
  errors: {}
});

const ValidationRequestDetailPage = (): JSX.Element => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: request, isLoading, error } = useValidationRequest(id);
  const approveItem = useApproveItem(id);
  const rejectItem = useRejectItem(id);
  const revokeRequest = useRevokeValidationRequest();
  const currentUser = useAuthStore((state) => state.user);
  const { data: employeeSkills } = useEmployeeSkills(request?.employeeId ?? '');

  const [action, setAction] = useState<ActionState | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const isDeletion = request?.requestType === ValidationRequestType.DELETION;
  const closeAction = () => setAction(null);

  const handleSubmitAction = async () => {
    if (!action) {
      return;
    }

    const nextErrors: ActionState['errors'] = {};

    if (action.type === 'approve' && !isDeletion && action.level === '') {
      nextErrors.level = 'Validated level is required';
    }

    if (action.type === 'reject' && !action.comment.trim()) {
      nextErrors.comment = 'Comment is required';
    }

    if (Object.keys(nextErrors).length > 0) {
      setAction((current) => (current ? { ...current, errors: nextErrors } : null));
      return;
    }

    try {
      if (action.type === 'approve') {
        await approveItem.mutateAsync({
          itemId: action.itemId,
          payload: {
            ...(isDeletion ? {} : { managerValidatedLevel: action.level as number }),
            managerComment: action.comment.trim() || undefined
          }
        });
        showToast(isDeletion ? 'Deletion approved — skill removed' : 'Skill approved');
      } else {
        await rejectItem.mutateAsync({ itemId: action.itemId, payload: { managerComment: action.comment.trim() } });
        showToast(isDeletion ? 'Deletion rejected' : 'Skill rejected');
      }
      closeAction();
    } catch {
      showToast(action.type === 'approve' ? 'Failed to approve skill' : 'Failed to reject skill', 'error');
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeRequest.mutateAsync(id);
      showToast('Validation request revoked');
    } catch {
      showToast('Failed to revoke validation request', 'error');
    } finally {
      setRevokeOpen(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Button variant="text" onClick={() => navigate('/validation-requests')} sx={{ alignSelf: 'flex-start' }}>
          Back to Validation Requests
        </Button>
        <Typography color="error">{error instanceof Error ? error.message : 'Unable to load validation request.'}</Typography>
      </Stack>
    );
  }

  if (!request) {
    return (
      <Box p={3}>
        <Typography>Request not found.</Typography>
      </Box>
    );
  }

  const isSubmittingAction = approveItem.isPending || rejectItem.isPending;
  const canRevoke =
    request.status === ValidationRequestStatus.SUBMITTED &&
    Boolean(currentUser) &&
    request.submittedById === currentUser?.id &&
    request.items.length > 0 &&
    request.items.every((item) => item.status === ValidationRequestStatus.SUBMITTED);

  const pendingCount = request.items.filter((item) => item.status === ValidationRequestStatus.SUBMITTED).length;
  const skillById = new Map((employeeSkills ?? []).map((skill) => [skill.id, skill]));

  return (
    <Stack spacing={3}>
      <WorkforcePageHeader
        title={request.employeeName}
        breadcrumbs={[{ label: 'Validation Requests', to: '/validation-requests' }, { label: request.employeeName }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate(`/employees/${request.employeeId}`)}>
              View Employee Profile
            </Button>
            {canRevoke ? (
              <Button color="error" variant="outlined" onClick={() => setRevokeOpen(true)}>
                Revoke
              </Button>
            ) : null}
          </Stack>
        }
      />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" useFlexGap flexWrap="wrap">
          <StatusChip status={request.status} />
          {isDeletion ? <Chip size="small" color="warning" label="Skill deletion request" /> : null}
          <Typography variant="body2" color="text.secondary">
            Submitted {formatDate(request.submittedAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {request.items.length} {request.items.length === 1 ? 'skill' : 'skills'}
            {pendingCount > 0 ? ` · ${pendingCount} awaiting decision` : ''}
          </Typography>
        </Stack>
        {isDeletion ? (
          <Alert severity="warning" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
            <strong>Reason:</strong> {request.reason?.trim() ? request.reason : 'No reason recorded'}
          </Alert>
        ) : null}
      </Paper>

      {request.items.length === 0 ? (
        <Typography color="text.secondary">No items in this request.</Typography>
      ) : (
        request.items.map((item) => (
          <ValidationItemCard
            key={item.id}
            item={item}
            skill={skillById.get(item.employeeSkillId)}
            isDeletion={isDeletion}
            currentUserId={currentUser?.id}
            onApprove={() => setAction(createActionState(item, 'approve', isDeletion))}
            onReject={() => setAction(createActionState(item, 'reject', isDeletion))}
          />
        ))
      )}

      <ConfirmDialog
        open={revokeOpen}
        title="Revoke Validation Request"
        message="Revoke this submitted request? Its skills return to their state before submission (a deletion request is simply withdrawn) and the request is cancelled."
        onConfirm={handleRevoke}
        onCancel={() => setRevokeOpen(false)}
        loading={revokeRequest.isPending}
        confirmLabel="Revoke"
      />

      <Dialog open={Boolean(action)} onClose={closeAction} maxWidth="sm" fullWidth>
        <DialogTitle>
          {action?.type === 'approve' ? (isDeletion ? 'Approve Deletion' : 'Approve Skill') : isDeletion ? 'Reject Deletion' : 'Reject Skill'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isDeletion && action?.type === 'approve' ? (
              <Typography>Approving permanently deletes this skill from the employee&apos;s profile. Its history stays recorded.</Typography>
            ) : null}
            {action?.type === 'approve' && !isDeletion ? (
              <LevelSelect
                value={action.level}
                onChange={(value) => setAction((current) => (current ? { ...current, level: value, errors: { ...current.errors, level: undefined } } : null))}
                label="Validated Level"
                required
                error={Boolean(action.errors.level)}
                helperText={action.errors.level}
              />
            ) : null}
            <CommentField
              value={action?.comment ?? ''}
              onChange={(value) =>
                setAction((current) => (current ? { ...current, comment: value, errors: { ...current.errors, comment: undefined } } : null))
              }
              label={action?.type === 'approve' ? 'Comment (optional)' : 'Comment (required)'}
              required={action?.type !== 'approve'}
              error={Boolean(action?.errors.comment)}
              helperText={action?.errors.comment}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAction} disabled={isSubmittingAction}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={action?.type === 'approve' ? 'success' : 'error'}
            onClick={handleSubmitAction}
            disabled={isSubmittingAction}
          >
            {action?.type === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ValidationRequestDetailPage;
