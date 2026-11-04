import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { CommentField, DateField, LevelSelect } from '../../components/FormFields';
import { DetailRow, SectionTitle, SkillLevelBadge, StatusChip, WorkforcePageHeader } from '../../components';
import { formatDateTime } from '../../features/demand/demandFormat';
import MySkillCertificatesCard from '../../features/certification/MySkillCertificatesCard';
import { useMySkillHistory, useMySkills, useUpdateMySkill } from '../../features/employeeSkill/employeeSkillApi';
import SkillHistoryAccordion from '../../features/employeeSkill/SkillHistoryAccordion';
import { formatStatus } from '../../features/employeeSkill/skillHistory';
import { useMyValidationRequests } from '../../features/validation/validationApi';
import { useToast } from '../../lib/ToastProvider';
import useAuthStore from '@store/authStore';
import { ValidationRequestStatus, ValidationRequestType, ValidationStatus } from '../../types/enums';
import type { EmployeeSkill } from '../../types/employeeSkill.types';

interface FormErrors {
  level?: string;
  years?: string;
  comment?: string;
}

interface SkillEditFormProps {
  skill: EmployeeSkill;
  locked: boolean;
  onCancel: () => void;
  onSaved: () => void;
}

const yearsText = (skill: EmployeeSkill): string => (skill.yearsOfExperience !== undefined ? String(skill.yearsOfExperience) : '');

const SkillEditForm = ({ skill, locked, onCancel, onSaved }: SkillEditFormProps): JSX.Element => {
  const updateSkill = useUpdateMySkill();
  const { showToast } = useToast();
  const [level, setLevel] = useState<number | ''>(skill.selfAssessedLevel);
  const [years, setYears] = useState(yearsText(skill));
  const [lastUsedDate, setLastUsedDate] = useState(skill.lastUsedDate ?? '');
  const [comment, setComment] = useState(skill.employeeComment ?? '');
  const [errors, setErrors] = useState<FormErrors>({});

  const isDirty =
    level !== skill.selfAssessedLevel ||
    years !== yearsText(skill) ||
    lastUsedDate !== (skill.lastUsedDate ?? '') ||
    comment !== (skill.employeeComment ?? '');

  const validate = (): boolean => {
    const next: FormErrors = {};
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
    if (!validate()) return;
    try {
      await updateSkill.mutateAsync({
        id: skill.id,
        payload: {
          skillId: skill.skillId,
          selfAssessedLevel: level as number,
          yearsOfExperience: years !== '' ? Number(years) : undefined,
          lastUsedDate: lastUsedDate || undefined,
          employeeComment: comment || undefined
        }
      });
      showToast('Skill updated successfully');
      onSaved();
    } catch {
      showToast('Failed to update skill', 'error');
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <SectionTitle>Edit assessment</SectionTitle>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Change your self-assessment. The history records each change with the old and the new value.
      </Typography>
      {skill.validationStatus === ValidationStatus.VALIDATED ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Saving a change moves this validated skill to Reopened For Edit. Submit it for validation again from My Skills.
        </Alert>
      ) : null}
      {locked ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This skill is waiting for a manager&apos;s decision and cannot be edited. Revoke the request from My Skills first.
        </Alert>
      ) : null}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <LevelSelect
          value={level}
          onChange={setLevel}
          required
          disabled={locked}
          error={Boolean(errors.level)}
          helperText={errors.level}
        />
        <TextField
          fullWidth
          label="Years of Experience"
          type="number"
          value={years}
          onChange={(event) => setYears(event.target.value)}
          disabled={locked}
          inputProps={{ min: 0, step: 0.5 }}
          error={Boolean(errors.years)}
          helperText={errors.years}
        />
        <DateField value={lastUsedDate} onChange={setLastUsedDate} disabled={locked} />
        <Box sx={{ gridColumn: '1 / -1' }}>
          <CommentField
            value={comment}
            onChange={setComment}
            label="Your Comment"
            disabled={locked}
            error={Boolean(errors.comment)}
            helperText={errors.comment}
          />
        </Box>
      </Box>
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={locked || !isDirty || updateSkill.isPending} onClick={() => void save()}>
          Save changes
        </Button>
      </Stack>
    </Paper>
  );
};

function MySkillEditPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const { data: skills, isLoading, isError } = useMySkills();
  const { data: submittedRequests } = useMyValidationRequests(ValidationRequestStatus.SUBMITTED);
  const history = useMySkillHistory(id);

  const skill = skills?.find((candidate) => candidate.id === id);
  const hasPendingDeletion = (submittedRequests?.content ?? []).some(
    (request) =>
      request.requestType === ValidationRequestType.DELETION &&
      request.status === ValidationRequestStatus.SUBMITTED &&
      request.items?.some((item) => item.employeeSkillId === id && item.status === ValidationRequestStatus.SUBMITTED)
  );
  const locked = skill?.validationStatus === ValidationStatus.SUBMITTED || hasPendingDeletion;

  const backToList = (): void => navigate('/my-skills');

  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
        <CircularProgress aria-label="Loading skill" />
      </Box>
    );
  }

  if (isError || !skill) {
    return (
      <Box>
        <Typography color="error">Skill not found.</Typography>
        <Button sx={{ mt: 2 }} onClick={backToList}>
          Back to My Skills
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <WorkforcePageHeader
        title={skill.skillName}
        breadcrumbs={[{ label: 'My Skills', to: '/my-skills' }, { label: skill.skillName }]}
      />
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
        <StatusChip status={skill.validationStatus} label={formatStatus(skill.validationStatus)} />
        <Typography variant="body2">{skill.categoryName}</Typography>
      </Stack>

      <Box
        sx={{ display: 'grid', gap: 2.25, alignItems: 'start', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.25fr) minmax(0, 1fr)' } }}
      >
        <SkillEditForm key={skill.id} skill={skill} locked={locked} onCancel={backToList} onSaved={backToList} />

        <Stack spacing={1.75}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <SectionTitle>Skill details</SectionTitle>
            <Stack component="dl" spacing={1.25} sx={{ m: 0, mt: 1.5 }}>
              <DetailRow label="Skill">{skill.skillName}</DetailRow>
              <DetailRow label="Category">{skill.categoryName}</DetailRow>
              <DetailRow label="Status">{formatStatus(skill.validationStatus)}</DetailRow>
              <DetailRow label="Validated level">
                {skill.managerValidatedLevel ? <SkillLevelBadge level={skill.managerValidatedLevel} /> : 'Not validated'}
              </DetailRow>
              <DetailRow label="Manager comment">{skill.managerComment || 'Not set'}</DetailRow>
              <DetailRow label="Last validated">
                {skill.lastValidatedDate ? formatDateTime(skill.lastValidatedDate) : 'Not validated'}
              </DetailRow>
              <DetailRow label="Added">{formatDateTime(skill.createdAt)}</DetailRow>
              <DetailRow label="Last updated">{formatDateTime(skill.lastUpdatedDate)}</DetailRow>
            </Stack>
          </Paper>
          <MySkillCertificatesCard employeeSkillId={skill.id} skillId={skill.skillId} skillName={skill.skillName} />
          <SkillHistoryAccordion
            revisions={history.data}
            isLoading={history.isLoading}
            isError={history.isError}
            currentUserId={currentUser?.id}
          />
        </Stack>
      </Box>
    </Box>
  );
}

export default MySkillEditPage;
