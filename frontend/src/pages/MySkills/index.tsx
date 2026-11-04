import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UndoIcon from '@mui/icons-material/Undo';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CommentField } from '../../components/FormFields';
import { ColumnSelector, ConfirmDialog, DataTable, SkillLevelBadge, StatusChip, useColumnVisibility } from '../../components';
import type { DataTableColumn } from '../../components';
import {
  useDeleteMySkill,
  useMySkills,
  useRequestSkillDeletion,
  useSubmitValidation
} from '@features/employeeSkill/employeeSkillApi';
import { useExportSkillMatrix } from '@features/export/exportApi';
import { useMySkillCertificateCounts } from '@features/certification/certificationApi';
import { useMyValidationRequests, useRevokeValidationRequest } from '@features/validation/validationApi';
import { useAuthStore } from '@store/authStore';
import RestoreLatestValidatedAction from './RestoreLatestValidatedAction';
import { useToast } from '../../lib/ToastProvider';
import { ValidationRequestStatus, ValidationRequestType, ValidationStatus } from '../../types/enums';
import type { EmployeeSkill } from '../../types/employeeSkill.types';

const formatLabel = (value: string): string =>
  value
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

// Status tiles shown in the KPI strip — order matters for visual grouping
const STATUS_ORDER: ValidationStatus[] = [
  ValidationStatus.DRAFT,
  ValidationStatus.SUBMITTED,
  ValidationStatus.VALIDATED,
  ValidationStatus.REJECTED,
  ValidationStatus.REOPENED_FOR_EDIT,
  ValidationStatus.ARCHIVED
];

// Statuses an employee can submit for validation (a reopened validated skill is re-submitted after editing)
const SUBMITTABLE_STATUSES: ValidationStatus[] = [ValidationStatus.DRAFT, ValidationStatus.REOPENED_FOR_EDIT];

// Columns that cannot be hidden: the skill must stay identifiable and its actions reachable.
const REQUIRED_COLUMNS = ['skillName', 'actions'];

const MySkillsPage = (): JSX.Element => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: skills = [], isLoading, error } = useMySkills();
  const { data: certificateCounts } = useMySkillCertificateCounts();
  const { showToast } = useToast();
  const deleteSkill = useDeleteMySkill();
  const requestDeletion = useRequestSkillDeletion();
  const submitValidation = useSubmitValidation();
  const exportSkillMatrix = useExportSkillMatrix();
  const currentUser = useAuthStore((state) => state.user);
  const { data: submittedRequests } = useMyValidationRequests(ValidationRequestStatus.SUBMITTED);
  const revokeRequest = useRevokeValidationRequest();

  const activeCategory = searchParams.get('category') ?? '';
  const activeStatus = (searchParams.get('status') ?? '') as ValidationStatus | '';

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletionRequestId, setDeletionRequestId] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [revokeRequestId, setRevokeRequestId] = useState<string | null>(null);

  // Revoke is offered only to the requester while no item of the SUBMITTED request has been decided
  const revocableRequestBySkill = useMemo(() => {
    const map = new Map<string, string>();
    (submittedRequests?.content ?? [])
      .filter(
        (request) =>
          request.status === ValidationRequestStatus.SUBMITTED &&
          request.submittedById === currentUser?.id &&
          (request.items?.length ?? 0) > 0 &&
          request.items!.every((item) => item.status === ValidationRequestStatus.SUBMITTED)
      )
      .forEach((request) => request.items!.forEach((item) => map.set(item.employeeSkillId, request.id)));
    return map;
  }, [submittedRequests, currentUser?.id]);

  // Skills awaiting a manager's deletion decision are locked like SUBMITTED ones
  const pendingDeletionSkillIds = useMemo(() => {
    const ids = new Set<string>();
    (submittedRequests?.content ?? [])
      .filter((request) => request.requestType === ValidationRequestType.DELETION && request.status === ValidationRequestStatus.SUBMITTED)
      .forEach((request) =>
        request.items?.filter((item) => item.status === ValidationRequestStatus.SUBMITTED).forEach((item) => ids.add(item.employeeSkillId))
      );
    return ids;
  }, [submittedRequests]);

  // Status KPI counts (only statuses that actually exist in user's skills)
  const statusCounts = useMemo(() => {
    const map = new Map<ValidationStatus, number>();
    skills.forEach((s) => map.set(s.validationStatus, (map.get(s.validationStatus) ?? 0) + 1));
    return STATUS_ORDER.filter((s) => map.has(s)).map((s) => ({ status: s, count: map.get(s)! }));
  }, [skills]);

  // Category chips (alphabetically sorted)
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    skills.forEach((s) => map.set(s.categoryName, (map.get(s.categoryName) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [skills]);

  const filteredSkills = useMemo(
    () =>
      skills.filter(
        (s) =>
          (!activeCategory || s.categoryName === activeCategory) &&
          (!activeStatus || s.validationStatus === activeStatus)
      ),
    [skills, activeCategory, activeStatus]
  );

  const draftIds = useMemo(
    () => skills.filter((s) => SUBMITTABLE_STATUSES.includes(s.validationStatus)).map((s) => s.id),
    [skills]
  );

  useEffect(() => {
    // Keep the same array when nothing changes, otherwise the render-time `skills = []` default loops while loading
    setSelectedIds((current) => (current.every((id) => draftIds.includes(id)) ? current : current.filter((id) => draftIds.includes(id))));
  }, [draftIds]);

  const setFilter = (key: 'category' | 'status', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    next.delete('status');
    setSearchParams(next);
  };

  const hasActiveFilters = Boolean(activeCategory || activeStatus);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSkill.mutateAsync(deleteId);
      showToast('Skill deleted');
      setSelectedIds((current) => current.filter((id) => id !== deleteId));
    } catch {
      showToast('Failed to delete skill', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const closeDeletionRequest = () => {
    setDeletionRequestId(null);
    setDeletionReason('');
  };

  const handleRequestDeletion = async () => {
    if (!deletionRequestId || !deletionReason.trim()) return;
    try {
      await requestDeletion.mutateAsync({ id: deletionRequestId, reason: deletionReason.trim() });
      showToast('Deletion request sent to your manager');
      setSelectedIds((current) => current.filter((id) => id !== deletionRequestId));
      closeDeletionRequest();
    } catch {
      showToast('Failed to request deletion', 'error');
    }
  };

  const handleRevoke = async () => {
    if (!revokeRequestId) return;
    try {
      await revokeRequest.mutateAsync(revokeRequestId);
      showToast('Validation request revoked');
    } catch {
      showToast('Failed to revoke validation request', 'error');
    } finally {
      setRevokeRequestId(null);
    }
  };

  const handleSubmit = async () => {
    const draftSelectedIds = selectedIds.filter((id) => draftIds.includes(id));
    if (draftSelectedIds.length === 0) return;
    try {
      await submitValidation.mutateAsync({ employeeSkillIds: draftSelectedIds });
      showToast('Skills submitted for validation');
      setSelectedIds([]);
    } catch {
      showToast('Failed to submit', 'error');
    }
  };

  const columns: DataTableColumn<EmployeeSkill>[] = [
    { key: 'skillName', label: 'Skill Name' },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'selfAssessedLevel',
      label: 'Self-Assessed Level',
      render: (row) => <SkillLevelBadge level={row.selfAssessedLevel} />
    },
    {
      key: 'managerValidatedLevel',
      label: 'Validated Level',
      render: (row) => (row.managerValidatedLevel ? <SkillLevelBadge level={row.managerValidatedLevel} /> : '—')
    },
    {
      key: 'validationStatus',
      label: 'Status',
      render: (row) => <StatusChip status={row.validationStatus} />
    },
    {
      key: 'yearsOfExperience',
      label: 'Years Exp',
      render: (row) => row.yearsOfExperience ?? '—'
    },
    {
      key: 'lastUsedDate',
      label: 'Last Used',
      render: (row) => row.lastUsedDate ?? '—'
    },
    {
      key: 'employeeComment',
      label: 'My Note',
      render: (row) => row.employeeComment?.trim() || '—'
    },
    {
      key: 'managerComment',
      label: 'Manager Feedback',
      render: (row) => row.managerComment ?? '—'
    },
    {
      key: 'certificates',
      label: 'Certificates',
      render: (row) => {
        const count = certificateCounts?.[row.id] ?? 0;
        return count > 0 ? (
          <Chip
            size="small"
            variant="outlined"
            clickable
            icon={<WorkspacePremiumOutlinedIcon />}
            label={count}
            aria-label={`${count} certificates for ${row.skillName}`}
            onClick={() => navigate(`/my-skills/${row.id}/edit`)}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            None
          </Typography>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const requestId = revocableRequestBySkill.get(row.id);
        if (pendingDeletionSkillIds.has(row.id)) {
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" color="warning" label="Deletion requested" />
              {requestId ? (
                <Tooltip title="Revoke">
                  <IconButton size="small" color="error" aria-label="Revoke" onClick={() => setRevokeRequestId(requestId)}>
                    <UndoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          );
        }
        if (row.validationStatus !== ValidationStatus.SUBMITTED) {
          const isDraft = row.validationStatus === ValidationStatus.DRAFT;
          const deleteLabel = isDraft ? 'Delete' : 'Request deletion';
          return (
            <Stack direction="row" spacing={0.5} sx={{ whiteSpace: 'nowrap' }}>
              <Tooltip title="Edit">
                <IconButton size="small" aria-label="Edit" onClick={() => navigate(`/my-skills/${row.id}/edit`)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={deleteLabel}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={deleteLabel}
                  onClick={() => (isDraft ? setDeleteId(row.id) : setDeletionRequestId(row.id))}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <RestoreLatestValidatedAction skill={row} />
            </Stack>
          );
        }
        return requestId ? (
          <Tooltip title="Revoke">
            <IconButton size="small" color="error" aria-label="Revoke" onClick={() => setRevokeRequestId(requestId)}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null;
      }
    }
  ];

  const { visibleColumns, selectorProps } = useColumnVisibility('my-skills', columns, REQUIRED_COLUMNS);

  const draftSelectedIds = selectedIds.filter((id) => draftIds.includes(id));
  // Non-blocking hint: a certificate gives the manager proof to base the decision on.
  const selectedWithoutCertificate = certificateCounts
    ? draftSelectedIds.filter((id) => !certificateCounts[id])
    : [];

  // Shared selected-card style (functional state indicator, not decorative)
  const selectedCardSx = {
    backgroundColor: alpha(theme.palette.secondary.main, 0.06),
    boxShadow: `inset 0 0 0 2px ${theme.palette.secondary.main}`
  };

  return (
    <Stack spacing={3}>
      {/* ── Page header ─────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2}>
        <Box>
          <Typography variant="h4">My Skills</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your self-assessed skills and submit drafts for validation.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={exportSkillMatrix.isPending}
            onClick={() => exportSkillMatrix.mutate()}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            onClick={handleSubmit}
            disabled={draftSelectedIds.length === 0 || submitValidation.isPending}
          >
            {draftSelectedIds.length > 0
              ? `Submit ${draftSelectedIds.length} for Validation`
              : 'Submit for Validation'}
          </Button>
          <Button onClick={() => navigate('/my-skills/new')}>
            Add Skill
          </Button>
        </Stack>
      </Stack>

      {/* ── Status KPI strip ────────────────────────────────── */}
      {statusCounts.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Skills by Status
          </Typography>
          <Grid container spacing={2}>
            {/* "All" tile */}
            <Grid item xs={6} sm={4} md={2}>
              <Card
                elevation={0}
                sx={{
                  height: 96,
                  ...(activeStatus === '' && activeCategory === '' ? selectedCardSx : {})
                }}
              >
                <CardActionArea
                  sx={{ height: '100%', cursor: 'pointer' }}
                  onClick={clearFilters}
                >
                  <CardContent sx={{ p: '12px 16px !important' }}>
                    <Typography variant="h4" fontWeight={700} color="secondary.main" lineHeight={1}>
                      {skills.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      All Skills
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            {statusCounts.map(({ status, count }) => {
              const isActive = activeStatus === status;
              return (
                <Grid item xs={6} sm={4} md={2} key={status}>
                  <Card
                    elevation={0}
                    sx={{ height: 96, ...(isActive ? selectedCardSx : {}) }}
                  >
                    <CardActionArea
                      sx={{ height: '100%', cursor: 'pointer' }}
                      onClick={() => setFilter('status', isActive ? '' : status)}
                    >
                      <CardContent sx={{ p: '12px 16px !important' }}>
                        <Typography variant="h4" fontWeight={700} color="secondary.main" lineHeight={1}>
                          {count}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          {formatLabel(status)}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ── Category filter chips + Table in one container ─── */}
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {categoryStats.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={1}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ flexShrink: 0, mr: 0.5 }}
                >
                  Category
                </Typography>

                <Chip
                  label={`All · ${skills.length}`}
                  size="small"
                  variant={activeCategory === '' ? 'filled' : 'outlined'}
                  color={activeCategory === '' ? 'secondary' : 'default'}
                  onClick={() => setFilter('category', '')}
                  sx={{ cursor: 'pointer' }}
                />

                {categoryStats.map(({ name, count }) => {
                  const isActive = activeCategory === name;
                  return (
                    <Chip
                      key={name}
                      label={`${name} · ${count}`}
                      size="small"
                      variant={isActive ? 'filled' : 'outlined'}
                      color={isActive ? 'secondary' : 'default'}
                      onClick={() => setFilter('category', isActive ? '' : name)}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}

                {hasActiveFilters && (
                  <Button
                    size="small"
                    variant="text"
                    onClick={clearFilters}
                    sx={{ ml: 'auto', color: 'text.secondary', fontWeight: 400, minWidth: 0 }}
                  >
                    Clear filters
                  </Button>
                )}
              </Stack>
            </Box>
            <Divider />
          </>
        )}

        {selectedWithoutCertificate.length > 0 ? (
          <Alert
            severity="info"
            sx={{ m: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate(`/my-skills/${selectedWithoutCertificate[0]}/edit`)}
              >
                Add certificate
              </Button>
            }
          >
            {selectedWithoutCertificate.length === 1
              ? '1 selected skill has no certificate linked.'
              : `${selectedWithoutCertificate.length} selected skills have no certificate linked.`}{' '}
            You can still submit, but a certificate helps your manager decide faster.
          </Alert>
        ) : null}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1 }}>
          <ColumnSelector<EmployeeSkill> {...selectorProps} />
        </Box>
        <Divider />

        <DataTable<EmployeeSkill>
          columns={visibleColumns}
          rows={filteredSkills}
          loading={isLoading}
          error={error instanceof Error ? error.message : null}
          emptyMessage={
            hasActiveFilters
              ? 'No skills match the selected filters.'
              : 'No skills yet. Add your first skill to get started.'
          }
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isRowSelectable={(row) => SUBMITTABLE_STATUSES.includes(row.validationStatus)}
        />
      </Paper>

      {/* ── Dialogs ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Skill"
        message="Delete this draft skill from your profile? It has never been validated, so no approval is needed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleteSkill.isPending}
        confirmLabel="Delete"
      />

      <Dialog open={Boolean(deletionRequestId)} onClose={closeDeletionRequest} maxWidth="sm" fullWidth>
        <DialogTitle>Request Skill Deletion</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography>
              Your manager decides this request. The skill is removed from your profile only if it is approved.
            </Typography>
            <CommentField
              value={deletionReason}
              onChange={setDeletionReason}
              label="Reason (required)"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeletionRequest} disabled={requestDeletion.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRequestDeletion}
            disabled={!deletionReason.trim() || requestDeletion.isPending}
          >
            Request deletion
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(revokeRequestId)}
        title="Revoke Validation Request"
        message="Revoke this submitted request? Its skills return to their state before submission (a deletion request is simply withdrawn) and the request is cancelled."
        onConfirm={handleRevoke}
        onCancel={() => setRevokeRequestId(null)}
        loading={revokeRequest.isPending}
        confirmLabel="Revoke"
      />
    </Stack>
  );
};

export default MySkillsPage;
