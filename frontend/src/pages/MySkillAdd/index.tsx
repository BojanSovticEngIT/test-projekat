import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CommentField, DateField, LevelSelect } from '../../components/FormFields';
import { DetailRow, SectionTitle, WorkforcePageHeader } from '../../components';
import { useMyCertifications } from '../../features/certification/certificationApi';
import { useAddMySkill, useMySkills } from '../../features/employeeSkill/employeeSkillApi';
import { useSkillCategories, useSkills } from '../../features/skill/skillApi';
import { useToast } from '../../lib/ToastProvider';
import type { Skill } from '../../types/skill.types';

interface FormErrors {
  skill?: string;
  level?: string;
  years?: string;
  comment?: string;
}

function MySkillAddPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const addSkill = useAddMySkill();
  const { data: mySkills = [] } = useMySkills();
  const { data: myCertificates } = useMyCertifications({ page: 0, size: 100 });
  const { data: categories = [] } = useSkillCategories();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selected, setSelected] = useState<Skill | null>(null);
  const [level, setLevel] = useState<number | ''>('');
  const [years, setYears] = useState('');
  const [lastUsedDate, setLastUsedDate] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const matchingCertificates = selected
    ? (myCertificates?.content ?? []).filter((certificate) => certificate.skills.some((skill) => skill.id === selected.id))
    : [];

  const { data: skillsPage, isLoading: skillsLoading } = useSkills({
    search: search || undefined,
    categoryId: categoryId || undefined,
    size: 100
  });
  const skills = skillsPage?.content ?? [];
  const existingSkillIds = new Set(mySkills.map((skill) => skill.skillId));

  const backToList = (): void => navigate('/my-skills');

  const selectSkill = (skill: Skill): void => {
    setSelected(skill);
    setErrors((current) => ({ ...current, skill: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!selected) next.skill = 'Please select a skill';
    if (level === '') next.level = 'Knowledge level is required';
    const parsedYears = years !== '' ? Number(years) : undefined;
    if (parsedYears !== undefined && (!Number.isFinite(parsedYears) || parsedYears < 0)) {
      next.years = 'Must be greater than or equal to 0';
    }
    if (comment.length > 2000) next.comment = 'Max 2000 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (): Promise<void> => {
    if (!validate() || !selected) return;
    try {
      await addSkill.mutateAsync({
        skillId: selected.id,
        selfAssessedLevel: level as number,
        yearsOfExperience: years !== '' ? Number(years) : undefined,
        lastUsedDate: lastUsedDate || undefined,
        employeeComment: comment || undefined
      });
      showToast('Skill added successfully');
      backToList();
    } catch {
      showToast('Failed to add skill', 'error');
    }
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Add Skill"
        description="Pick a skill from the catalog and describe your own assessment of it."
        breadcrumbs={[{ label: 'My Skills', to: '/my-skills' }, { label: 'Add Skill' }]}
      />

      <Box
        sx={{ display: 'grid', gap: 2.25, alignItems: 'start', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' } }}
      >
        <Stack spacing={1.75}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <SectionTitle>Select skill</SectionTitle>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5, mb: 2 }}>
              <TextField
                label="Search skills"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                select
                label="Category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                size="small"
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 320, overflow: 'auto' }}>
              <List dense disablePadding aria-label="Skills">
                {!skillsLoading && skills.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No skills found
                  </Typography>
                ) : null}
                {skills.map((skill) => {
                  const isAdded = existingSkillIds.has(skill.id);
                  return (
                    <ListItemButton
                      key={skill.id}
                      selected={selected?.id === skill.id}
                      disabled={isAdded}
                      onClick={() => selectSkill(skill)}
                    >
                      <ListItemText
                        primary={skill.name}
                        secondary={isAdded ? `${skill.categoryName} — already added` : skill.categoryName}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
            {errors.skill ? (
              <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                {errors.skill}
              </Typography>
            ) : null}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <SectionTitle>Your assessment</SectionTitle>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selected ? `Describe your experience with ${selected.name}.` : 'Select a skill above to fill in your assessment.'}
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <LevelSelect
                value={level}
                onChange={setLevel}
                required
                disabled={!selected}
                error={Boolean(errors.level)}
                helperText={errors.level}
              />
              <TextField
                fullWidth
                label="Years of Experience"
                type="number"
                value={years}
                onChange={(event) => setYears(event.target.value)}
                disabled={!selected}
                inputProps={{ min: 0, step: 0.5 }}
                error={Boolean(errors.years)}
                helperText={errors.years}
              />
              <DateField value={lastUsedDate} onChange={setLastUsedDate} disabled={!selected} />
              <Box sx={{ gridColumn: '1 / -1' }}>
                <CommentField
                  value={comment}
                  onChange={setComment}
                  label="Your Comment"
                  disabled={!selected}
                  error={Boolean(errors.comment)}
                  helperText={errors.comment}
                />
              </Box>
            </Box>
            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button onClick={backToList} disabled={addSkill.isPending}>
                Cancel
              </Button>
              <Button variant="contained" disabled={!selected || addSkill.isPending} onClick={() => void save()}>
                Add skill
              </Button>
            </Stack>
          </Paper>
        </Stack>

        <Stack spacing={1.75}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <SectionTitle>Skill details</SectionTitle>
            {selected ? (
              <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 1.5 }}>
                <DetailRow label="Skill">{selected.name}</DetailRow>
                <DetailRow label="Category">{selected.categoryName}</DetailRow>
                <DetailRow label="Description">{selected.description?.trim() ? selected.description : 'Not set'}</DetailRow>
                <DetailRow label="Tags">
                  {selected.tags.length > 0 ? (
                    <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                      {selected.tags.map((tag) => (
                        <Chip key={tag} size="small" label={tag} />
                      ))}
                    </Stack>
                  ) : (
                    'None'
                  )}
                </DetailRow>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                No skill selected.
              </Typography>
            )}
          </Paper>
          {matchingCertificates.length > 0 ? (
            <Alert severity="success">
              {matchingCertificates.length === 1 ? 'You already have a certificate' : `You already have ${matchingCertificates.length} certificates`}{' '}
              linked to {selected?.name}: {matchingCertificates.map((certificate) => certificate.name).join(', ')}. Your manager will see
              {matchingCertificates.length === 1 ? ' it' : ' them'} when you submit this skill for validation.
            </Alert>
          ) : selected ? (
            <Alert severity="info">
              No certificate is linked to {selected.name} yet. You can add or link one from the skill&apos;s edit page after saving.
            </Alert>
          ) : null}
          <Alert severity="info">
            New skills start as Draft. Submit them for validation from My Skills when you are ready for your manager to review them.
          </Alert>
        </Stack>
      </Box>
    </Box>
  );
}

export default MySkillAddPage;
