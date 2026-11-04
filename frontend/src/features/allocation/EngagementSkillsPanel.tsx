import { useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useSkills } from '@features/skill/skillApi';
import useAuthStore from '@store/authStore';
import { UserRole, SkillStatus } from '../../types/enums';
import type { Skill } from '../../types/skill.types';
import type { AllocationLifecycleStatus } from '../../types/allocation.types';
import {
  ENGAGEMENT_SKILL_LEVELS,
  type EngagementSkillLevel
} from '../../types/engagement-skill.types';
import {
  useAddAllocationSkill,
  useAllocationSkills,
  useUpdateAllocationSkill
} from './engagementSkillApi';

interface EngagementSkillsPanelProps {
  allocationId?: string;
  employeeName?: string;
  projectName?: string;
  lifecycleStatus?: AllocationLifecycleStatus;
}

const formatLevel = (level: EngagementSkillLevel): string =>
  level.charAt(0) + level.slice(1).toLowerCase();

function EngagementSkillsPanel({
  allocationId,
  employeeName,
  projectName,
  lifecycleStatus
}: EngagementSkillsPanelProps): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const canWrite =
    user?.role === UserRole.ADMIN ||
    user?.role === UserRole.PMO ||
    user?.role === UserRole.LINE_MANAGER;
  const readOnly = !canWrite || lifecycleStatus === 'TERMINATED' || lifecycleStatus === 'PIPELINE';

  const { data: skills = [], isLoading } = useAllocationSkills(allocationId);
  const addSkill = useAddAllocationSkill();
  const updateSkill = useUpdateAllocationSkill();

  const [skillSearch, setSkillSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [levelUsed, setLevelUsed] = useState<EngagementSkillLevel>('PRACTITIONER');
  const [primarySkill, setPrimarySkill] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: skillsPage } = useSkills({
    search: skillSearch || undefined,
    status: SkillStatus.ACTIVE,
    size: 25
  });

  const catalogSkills = useMemo(() => {
    const recordedIds = new Set(skills.map((skill) => skill.skillId));
    return (skillsPage?.content ?? []).filter((skill) => !recordedIds.has(skill.id));
  }, [skills, skillsPage?.content]);

  const handleAdd = async () => {
    if (!allocationId || !selectedSkill) {
      setError('Select a catalog skill to add.');
      return;
    }

    try {
      setError(null);
      await addSkill.mutateAsync({
        allocationId,
        payload: {
          skillId: selectedSkill.id,
          levelUsed,
          primarySkill
        }
      });
      setSelectedSkill(null);
      setPrimarySkill(false);
      setLevelUsed('PRACTITIONER');
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Unable to add skill.');
    }
  };

  const handleTogglePrimary = async (skillId: string, currentPrimary: boolean, level: EngagementSkillLevel) => {
    if (!allocationId || readOnly) {
      return;
    }
    await updateSkill.mutateAsync({
      allocationId,
      skillId,
      payload: { skillId, levelUsed: level, primarySkill: !currentPrimary }
    });
  };

  return (
    <Stack spacing={2}>
      {employeeName && projectName ? (
        <Typography color="text.secondary">
          {employeeName} on {projectName}
        </Typography>
      ) : null}

      {lifecycleStatus === 'ACTIVE' && canWrite ? (
        <Alert severity="info">
          Record skills actually used on this engagement. Only catalog skills are accepted.
        </Alert>
      ) : null}

      {lifecycleStatus === 'TERMINATED' ? (
        <Alert severity="warning">This allocation has ended — skills are read-only.</Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Skill</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Role</TableCell>
              {!readOnly ? <TableCell>Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {skills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={readOnly ? 3 : 4}>No engagement skills recorded yet.</TableCell>
              </TableRow>
            ) : (
              skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell>{skill.skillName}</TableCell>
                  <TableCell>
                    <Chip label={formatLevel(skill.levelUsed)} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={skill.primarySkill ? 'Primary' : 'Supporting'}
                      size="small"
                      color={skill.primarySkill ? 'primary' : 'default'}
                    />
                  </TableCell>
                  {!readOnly ? (
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleTogglePrimary(skill.skillId, skill.primarySkill, skill.levelUsed)}
                      >
                        Mark as {skill.primarySkill ? 'Supporting' : 'Primary'}
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {!readOnly ? (
        <Stack spacing={2}>
          <Autocomplete
            options={catalogSkills}
            value={selectedSkill}
            onChange={(_, value) => setSelectedSkill(value)}
            onInputChange={(_, value) => setSkillSearch(value)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label="Catalog skill" />}
          />
          <TextField
            select
            label="Level used"
            value={levelUsed}
            onChange={(event) => setLevelUsed(event.target.value as EngagementSkillLevel)}
          >
            {ENGAGEMENT_SKILL_LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {formatLevel(level)}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={<Switch checked={primarySkill} onChange={(event) => setPrimarySkill(event.target.checked)} />}
            label="Primary skill on this engagement"
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={addSkill.isPending}
            sx={{ alignSelf: 'flex-start' }}
          >
            {addSkill.isPending ? 'Adding…' : 'Add Skill'}
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}

export default EngagementSkillsPanel;
