import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Autocomplete,
  Box,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { AllocationStatus, IntelligenceCatalog, SearchFilters, Seniority } from '../../types/intelligence.types';
import { SENIORITY_LABELS, STATUS_LABELS, levelLabel } from './intelligenceModel';

interface Props {
  catalog: IntelligenceCatalog;
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
}

type Option = { id: string; name: string };

const numberField = (value: number | null): string => (value === null ? '' : String(value));
const toNumber = (value: string): number | null => (value === '' || Number.isNaN(Number(value)) ? null : Number(value));

function MultiSelect<T extends Option>({ label, options, value, onChange, groupBy }: { label: string; options: T[]; value: string[]; onChange: (ids: string[]) => void; groupBy?: (option: T) => string }): JSX.Element {
  return (
    <Autocomplete<T, true>
      multiple
      size="small"
      options={options}
      groupBy={groupBy}
      getOptionLabel={(option) => option.name}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      value={options.filter((option) => value.includes(option.id))}
      onChange={(_, selected) => onChange(selected.map((option) => option.id))}
      renderTags={(selected, getTagProps) => selected.map((option, index) => <Chip size="small" label={option.name} {...getTagProps({ index })} key={option.id} />)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}

function CriteriaForm({ catalog, filters, onChange }: Props): JSX.Element {
  const set = (patch: Partial<SearchFilters>): void => onChange({ ...filters, ...patch });
  const skillName = (id: string): string => catalog.skills.find((skill) => skill.id === id)?.name ?? id;
  const unused = catalog.skills.filter((skill) => !filters.skills.some((item) => item.skillId === skill.id));
  const teams = catalog.teams.filter((team) => !filters.businessUnitIds.length || filters.businessUnitIds.includes(team.businessUnitId));
  const statusOptions = (Object.keys(STATUS_LABELS) as AllocationStatus[]).map((id) => ({ id, name: STATUS_LABELS[id] }));
  const seniorityOptions = (Object.keys(SENIORITY_LABELS) as Seniority[]).map((id) => ({ id, name: SENIORITY_LABELS[id] }));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Stack spacing={2}>
          <TextField size="small" label="Name or keyword (name, title, project, client)" value={filters.text} onChange={(event) => set({ text: event.target.value })} />
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Skills and technologies
            </Typography>
            <Autocomplete
              size="small"
              options={unused}
              groupBy={(option) => option.category}
              getOptionLabel={(option) => option.name}
              value={null}
              blurOnSelect
              onChange={(_, skill) => skill && set({ skills: [...filters.skills, { skillId: skill.id, minLevel: 3, minYears: null }] })}
              renderInput={(params) => <TextField {...params} label="Add skill or technology" />}
            />
            <Stack spacing={1} sx={{ mt: 1 }}>
              {filters.skills.map((criterion, index) => (
                <Stack key={criterion.skillId} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  <Typography sx={{ minWidth: 110, fontWeight: 600 }}>{skillName(criterion.skillId)}</Typography>
                  <TextField
                    select
                    size="small"
                    label="Min. competency"
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
                  <TextField
                    size="small"
                    type="number"
                    label="More than (years)"
                    inputProps={{ min: 0, max: 40, step: 0.5 }}
                    value={numberField(criterion.minYears)}
                    sx={{ width: 150 }}
                    onChange={(event) => {
                      const skills = [...filters.skills];
                      skills[index] = { ...criterion, minYears: toNumber(event.target.value) };
                      set({ skills });
                    }}
                  />
                  <IconButton aria-label={`Remove ${skillName(criterion.skillId)}`} size="small" onClick={() => set({ skills: filters.skills.filter((item) => item.skillId !== criterion.skillId) })}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
            {filters.skills.length > 1 ? (
              <RadioGroup row value={filters.skillMatch} onChange={(event) => set({ skillMatch: event.target.value === 'ANY' ? 'ANY' : 'ALL' })}>
                <FormControlLabel value="ALL" control={<Radio size="small" />} label="Must have all" />
                <FormControlLabel value="ANY" control={<Radio size="small" />} label="Any of them" />
              </RadioGroup>
            ) : null}
          </Box>
          <TextField
            size="small"
            type="number"
            label="Same skill for more than (years)"
            helperText="Any listed skill, or any skill if none is listed. Uses experience start dates."
            inputProps={{ min: 0, max: 40, step: 0.5 }}
            value={numberField(filters.anySkillMinYears)}
            onChange={(event) => set({ anySkillMinYears: toNumber(event.target.value) })}
          />
          <TextField size="small" label="Project history (project or client name)" value={filters.projectText} onChange={(event) => set({ projectText: event.target.value })} />
        </Stack>
      </Grid>

      <Grid item xs={12} md={6}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <MultiSelect label="Business unit" options={catalog.businessUnits} value={filters.businessUnitIds} onChange={(businessUnitIds) => set({ businessUnitIds, teamIds: [] })} />
            <MultiSelect label="Department / team" options={teams} value={filters.teamIds} onChange={(teamIds) => set({ teamIds })} />
          </Stack>
          <Autocomplete
            size="small"
            options={catalog.projects}
            getOptionLabel={(option) => `${option.name}${option.client ? ` (${option.client})` : ''}`}
            value={catalog.projects.find((project) => project.id === filters.currentProjectId) ?? null}
            onChange={(_, project) => set({ currentProjectId: project?.id ?? null })}
            renderInput={(params) => <TextField {...params} label="Current project" />}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              size="small"
              type="number"
              fullWidth
              label="On current project more than (years)"
              inputProps={{ min: 0, max: 40, step: 0.5 }}
              value={numberField(filters.minCurrentTenureYears)}
              onChange={(event) => set({ minCurrentTenureYears: toNumber(event.target.value) })}
            />
            <TextField
              size="small"
              type="number"
              fullWidth
              label="…at most (years)"
              inputProps={{ min: 0, max: 40, step: 0.5 }}
              value={numberField(filters.maxCurrentTenureYears)}
              onChange={(event) => set({ maxCurrentTenureYears: toNumber(event.target.value) })}
            />
          </Stack>
          <MultiSelect label="Allocation status" options={statusOptions} value={filters.allocationStatuses} onChange={(ids) => set({ allocationStatuses: ids as AllocationStatus[] })} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="Availability"
              value={filters.minAvailablePct ?? ''}
              onChange={(event) => set({ minAvailablePct: event.target.value === '' ? null : Number(event.target.value) })}
            >
              <MenuItem value="">Any</MenuItem>
              {[25, 50, 75, 100].map((pct) => (
                <MenuItem key={pct} value={pct}>
                  At least {pct}% free
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Needed from"
              InputLabelProps={{ shrink: true }}
              helperText="Empty = today"
              value={filters.availableFrom ?? ''}
              onChange={(event) => set({ availableFrom: event.target.value || null })}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Autocomplete
              multiple
              fullWidth
              size="small"
              options={catalog.countries}
              value={filters.countries}
              onChange={(_, countries) => set({ countries })}
              renderInput={(params) => <TextField {...params} label="Location" />}
            />
            <TextField select fullWidth size="small" label="Industry experience" value={filters.verticalId ?? ''} onChange={(event) => set({ verticalId: event.target.value || null })}>
              <MenuItem value="">Any</MenuItem>
              {catalog.verticals.map((vertical) => (
                <MenuItem key={vertical.id} value={vertical.id}>
                  {vertical.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          {catalog.scope.canSeeSeniority ? (
            <MultiSelect label="Seniority" options={seniorityOptions} value={filters.seniority} onChange={(ids) => set({ seniority: ids as Seniority[] })} />
          ) : null}
        </Stack>
      </Grid>
    </Grid>
  );
}

export default CriteriaForm;
