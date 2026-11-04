import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Autocomplete,
  Box,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { LEVEL_LABEL } from '../../components/SkillLevelBadge/SkillLevelBadge';
import type { SearchCatalog, SearchCatalogSkill, SearchFilters, Seniority } from '../../types/search.types';
import { SENIORITY_LABELS } from './searchFilters';

interface Props {
  catalog: SearchCatalog;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

const AVAILABILITY_OPTIONS: { value: number | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 25, label: 'At least 25% free' },
  { value: 50, label: 'At least 50% free' },
  { value: 75, label: 'At least 75% free' },
  { value: 100, label: '100% free (bench)' }
];

export const levelLabel = (level: number): string => `${level} — ${LEVEL_LABEL[level] ?? level}`;

function SearchFiltersPanel({ catalog, filters, onChange }: Props): JSX.Element {
  const set = (patch: Partial<SearchFilters>): void => onChange({ ...filters, ...patch });
  const skillById = new Map(catalog.skills.map((skill) => [skill.id, skill]));
  const unusedSkills = catalog.skills.filter((skill) => !filters.skills.some((item) => item.skillId === skill.id));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Typography variant="subtitle2" gutterBottom>
          Skills
        </Typography>
        <Autocomplete<SearchCatalogSkill>
          size="small"
          options={unusedSkills}
          groupBy={(option) => option.category}
          getOptionLabel={(option) => option.name}
          value={null}
          blurOnSelect
          onChange={(_, skill) => {
            if (skill) set({ skills: [...filters.skills, { skillId: skill.id, minLevel: 3, mustHave: true }] });
          }}
          renderInput={(params) => <TextField {...params} label="Add a skill" />}
        />
        <Stack spacing={1} sx={{ mt: 1 }}>
          {filters.skills.map((criterion, index) => (
            <Stack key={criterion.skillId} direction="row" spacing={1} alignItems="center">
              <Typography sx={{ minWidth: 120, fontWeight: 600 }}>{skillById.get(criterion.skillId)?.name}</Typography>
              <TextField
                select
                size="small"
                label="Minimum level"
                value={criterion.minLevel}
                sx={{ minWidth: 170 }}
                onChange={(event) => {
                  const skills = [...filters.skills];
                  skills[index] = { ...criterion, minLevel: Number(event.target.value) };
                  set({ skills });
                }}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <MenuItem key={level} value={level}>
                    {levelLabel(level)}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={criterion.mustHave}
                    onChange={(event) => {
                      const skills = [...filters.skills];
                      skills[index] = { ...criterion, mustHave: event.target.checked };
                      set({ skills });
                    }}
                  />
                }
                label={criterion.mustHave ? 'Must-have' : 'Nice to have'}
              />
              <IconButton
                size="small"
                aria-label={`Remove ${skillById.get(criterion.skillId)?.name}`}
                onClick={() => set({ skills: filters.skills.filter((item) => item.skillId !== criterion.skillId) })}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </Grid>

      <Grid item xs={12} md={6}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Availability"
              value={filters.minAvailablePct ?? ''}
              onChange={(event) => set({ minAvailablePct: event.target.value === '' ? null : Number(event.target.value) })}
            >
              {AVAILABILITY_OPTIONS.map((option) => (
                <MenuItem key={option.label} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Needed from"
              InputLabelProps={{ shrink: true }}
              value={filters.availableFrom ?? ''}
              helperText="Empty = today"
              onChange={(event) => set({ availableFrom: event.target.value || null })}
            />
          </Stack>
          <Autocomplete
            multiple
            size="small"
            options={catalog.countries}
            value={filters.countries}
            onChange={(_, countries) => set({ countries })}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => <Chip size="small" label={option} {...getTagProps({ index })} key={option} />)
            }
            renderInput={(params) => <TextField {...params} label="Country" />}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Business unit (incl. sub-units)"
              value={filters.unitId ?? ''}
              onChange={(event) => set({ unitId: event.target.value || null })}
            >
              <MenuItem value="">Any</MenuItem>
              {catalog.units.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="Industry experience (ranks higher)"
              value={filters.verticalId ?? ''}
              onChange={(event) => set({ verticalId: event.target.value || null })}
            >
              <MenuItem value="">Any</MenuItem>
              {catalog.verticals.map((vertical) => (
                <MenuItem key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Autocomplete<Seniority, true>
            multiple
            size="small"
            disabled={!catalog.scope.canSeeSeniority}
            options={Object.keys(SENIORITY_LABELS) as Seniority[]}
            getOptionLabel={(option) => SENIORITY_LABELS[option]}
            value={catalog.scope.canSeeSeniority ? filters.seniority : []}
            onChange={(_, seniority) => set({ seniority })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Seniority"
                helperText={catalog.scope.canSeeSeniority ? undefined : 'Only HR and Admin can filter by seniority'}
              />
            )}
          />
          <TextField
            size="small"
            label="Text (name, title, project, client, certificate)"
            value={filters.keywords}
            onChange={(event) => set({ keywords: event.target.value })}
          />
          {catalog.scope.canSeeExternal ? (
            <Box>
              <FormControlLabel
                control={
                  <Switch checked={filters.includeExternal} onChange={(event) => set({ includeExternal: event.target.checked })} />
                }
                label="Include external applicants (from recruiting)"
              />
            </Box>
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  );
}

export default SearchFiltersPanel;
