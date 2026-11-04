import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { DataTable, StatusChip, ConfirmDialog } from '../../components';
import type { DataTableColumn } from '../../components';
import {
  useSkillCategories,
  useCreateSkillCategory,
  useUpdateSkillCategory,
  useDeactivateSkillCategory
} from '@features/skill/skillApi';
import type { SkillCategory, SkillCategoryRequest } from '../../types/skill.types';

interface CategoryFormState {
  name: string;
  description: string;
}

const EMPTY_FORM: CategoryFormState = { name: '', description: '' };

const SkillCategoriesPage = (): JSX.Element => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SkillCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: categories, isLoading, error } = useSkillCategories();
  const createCategory = useCreateSkillCategory();
  const updateCategory = useUpdateSkillCategory();
  const deactivateCategory = useDeactivateSkillCategory();

  const openAdd = () => {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (category: SkillCategory) => {
    setEditingCategory(category);
    setForm({ name: category.name, description: category.description ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload: SkillCategoryRequest = {
      name: form.name.trim(),
      description: form.description.trim() || undefined
    };
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory.id, payload });
    } else {
      await createCategory.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDeactivate = async () => {
    if (!confirmId) return;
    await deactivateCategory.mutateAsync(confirmId);
    setConfirmId(null);
  };

  const isSaving = createCategory.isPending || updateCategory.isPending;

  const columns: DataTableColumn<SkillCategory>[] = [
    { key: 'name', label: 'Name' },
    {
      key: 'description',
      label: 'Description',
      render: (cat: SkillCategory) => cat.description || '—'
    },
    {
      key: 'active',
      label: 'Status',
      render: (cat: SkillCategory) => (
        <StatusChip status={cat.active ? 'ACTIVE' : 'INACTIVE'} />
      )
    },
    { key: 'skillCount', label: 'Skills' },
    {
      key: 'actions' as keyof SkillCategory,
      label: 'Actions',
      render: (cat: SkillCategory) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" onClick={(e) => { e.stopPropagation(); openEdit(cat); }}>
            Edit
          </Button>
          <Button
            size="small"
            color="warning"
            onClick={(e) => { e.stopPropagation(); setConfirmId(cat.id); }}
            disabled={!cat.active}
          >
            Deactivate
          </Button>
        </Stack>
      )
    }
  ];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4">Skill Categories</Typography>
          <Typography color="text.secondary">Manage the categories used to group skills.</Typography>
        </Box>
        <Button onClick={openAdd}>Add Category</Button>
      </Stack>

      <DataTable<SkillCategory>
        columns={columns}
        rows={categories ?? []}
        loading={isLoading}
        error={error instanceof Error ? error.message : null}
        emptyMessage="No categories found."
      />

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim()}
          >
            {editingCategory ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Deactivate Category"
        message="This category will be deactivated. This is blocked if it still has active skills."
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmId(null)}
        loading={deactivateCategory.isPending}
        confirmLabel="Deactivate"
      />
    </Stack>
  );
};

export default SkillCategoriesPage;

