import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { DataTable, StatusChip, ConfirmDialog } from '../../components';
import type { DataTableColumn } from '../../components';
import { useSkills, useSkillCategories, useCreateSkill, useUpdateSkill, useDeactivateSkill } from '@features/skill/skillApi';
import { useAuthStore } from '@store/authStore';
import { SkillStatus, UserRole } from '../../types/enums';
import type { Skill, SkillRequest } from '../../types/skill.types';

const SKILL_STATUS_OPTIONS = Object.values(SkillStatus);

interface SkillFormState {
  name: string;
  description: string;
  categoryId: string;
  tags: string;
}

const EMPTY_FORM: SkillFormState = { name: '', description: '', categoryId: '', tags: '' };

const SkillCatalogPage = (): JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const searchValue = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('categoryId') ?? '';
  const status = (searchParams.get('status') ?? '') as SkillStatus | '';
  const page = Number(searchParams.get('page') ?? '0') || 0;
  const size = Number(searchParams.get('size') ?? '20') || 20;

  const [searchInput, setSearchInput] = useState(searchValue);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillFormState>(EMPTY_FORM);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setSearchInput(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === searchValue) return;
      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('search', trimmed);
      } else {
        next.delete('search');
      }
      next.set('page', '0');
      setSearchParams(next);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput, searchParams, searchValue, setSearchParams]);

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? undefined,
      categoryId: categoryId || undefined,
      status: (status || undefined) as SkillStatus | undefined,
      page,
      size
    }),
    [categoryId, page, searchParams, size, status]
  );

  const { data, isLoading, error } = useSkills(filters);
  const { data: categories } = useSkillCategories();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deactivateSkill = useDeactivateSkill();

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    });
    next.set('page', updates.page ?? '0');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next);
    }
  };

  const openAdd = () => {
    setEditingSkill(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      description: skill.description ?? '',
      categoryId: skill.categoryId,
      tags: skill.tags.join(', ')
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: SkillRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      categoryId: form.categoryId,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    };
    if (editingSkill) {
      await updateSkill.mutateAsync({ id: editingSkill.id, payload });
    } else {
      await createSkill.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDeactivate = async () => {
    if (!confirmId) return;
    await deactivateSkill.mutateAsync(confirmId);
    setConfirmId(null);
  };

  const isSaving = createSkill.isPending || updateSkill.isPending;

  const columns: DataTableColumn<Skill>[] = [
    { key: 'name', label: 'Name' },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'status',
      label: 'Status',
      render: (skill: Skill) => <StatusChip status={skill.status} />
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (skill: Skill) => skill.tags.join(', ') || '—'
    },
    ...(isAdmin
      ? [
          {
            key: 'actions' as keyof Skill,
            label: 'Actions',
            render: (skill: Skill) => (
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(skill); }}>
                  Edit
                </Button>
                <Button
                  size="small"
                  color="warning"
                  onClick={(e) => { e.stopPropagation(); setConfirmId(skill.id); }}
                  disabled={skill.status !== SkillStatus.ACTIVE}
                >
                  Deactivate
                </Button>
              </Stack>
            )
          }
        ]
      : [])
  ];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Skill Catalog</Typography>
          <Typography color="text.secondary">Browse and manage the global skill catalog.</Typography>
        </Box>
        {isAdmin ? <Button onClick={openAdd}>Add Skill</Button> : null}
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by skill name"
        />
        <TextField
          select
          fullWidth
          label="Category"
          value={categoryId}
          onChange={(e) => updateParams({ categoryId: e.target.value || null, page: '0' })}
        >
          <MenuItem value="">All categories</MenuItem>
          {(categories ?? []).map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          label="Status"
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || null, page: '0' })}
        >
          <MenuItem value="">All statuses</MenuItem>
          {SKILL_STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        </Stack>
      </Paper>

      <DataTable<Skill>
        columns={columns}
        rows={data?.content ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyMessage="No skills found."
        pagination={{
          page: data?.number ?? page,
          size: data?.size ?? size,
          total: data?.totalElements ?? 0,
          onPageChange: (p) => updateParams({ page: String(p) }),
          onSizeChange: (s) => updateParams({ size: String(s), page: '0' })
        }}
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSkill ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Category"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              required
              fullWidth
            >
              {(categories ?? []).map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              fullWidth
              placeholder="e.g. backend, java, cloud"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim() || !form.categoryId}
          >
            {editingSkill ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Deactivate Skill"
        message="This skill will be marked as Inactive (or Deprecated if already in use). Are you sure?"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmId(null)}
        loading={deactivateSkill.isPending}
        confirmLabel="Deactivate"
      />
    </Stack>
  );
};

export default SkillCatalogPage;
