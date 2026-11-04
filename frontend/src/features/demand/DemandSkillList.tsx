import { useState } from 'react';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { CEFR, LEVELS } from './demandFormat';
import { LANGUAGE_CATEGORY, SKILL_CATALOG } from './demandOptions';
import type { DemandSkillSummary } from '../../types/demand.types';

interface SkillListProps {
  label: string;
  hint: string;
  languages: boolean;
  skills: DemandSkillSummary[];
  error: boolean;
  fromEmail?: boolean;
  // Optional skills have no must-have / nice-to-have priority.
  optional?: boolean;
  // Names that cannot be added here because another list already has them.
  excluded?: string[];
  onChange: (skills: DemandSkillSummary[]) => void;
}

const DemandSkillList = ({
  label,
  hint,
  languages,
  skills,
  error,
  fromEmail,
  optional = false,
  excluded = [],
  onChange
}: SkillListProps): JSX.Element => {
  const [selected, setSelected] = useState('');
  const shown = skills.filter((skill) => (skill.category === LANGUAGE_CATEGORY) === languages);
  const available = SKILL_CATALOG.filter(
    (item) =>
      (item.category === LANGUAGE_CATEGORY) === languages &&
      !skills.some((skill) => skill.name === item.name) &&
      !excluded.includes(item.name)
  );
  const levelNames = languages ? CEFR : LEVELS;

  const update = (name: string, patch: Partial<DemandSkillSummary>): void =>
    onChange(skills.map((skill) => (skill.name === name ? { ...skill, ...patch } : skill)));

  const add = (): void => {
    const item = SKILL_CATALOG.find((entry) => entry.name === selected);
    if (!item) return;
    onChange([...skills, { name: item.name, category: item.category, mustHave: !optional }]);
    setSelected('');
  };

  return (
    <Box sx={{ gridColumn: '1 / -1' }}>
      <Typography variant="subtitle2" color={error ? 'error' : undefined}>
        {label}
        {fromEmail ? (
          <Chip label="From email" size="small" color="info" variant="outlined" sx={{ ml: 1, height: 20 }} />
        ) : null}
      </Typography>
      {error ? (
        <Typography variant="caption" color="error" display="block">
          Not found in the email. Fill this field.
        </Typography>
      ) : null}
      <Stack spacing={1} sx={{ mt: 1 }}>
        {shown.map((skill) => (
          <Stack key={skill.name} direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Chip label={skill.name} size="small" />
            <TextField
              select
              size="small"
              label="Level"
              value={skill.level ?? 0}
              onChange={(event) => update(skill.name, { level: Number(event.target.value) || undefined })}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value={0}>Any level</MenuItem>
              {[1, 2, 3, 4, 5].map((level) => (
                <MenuItem key={level} value={level}>
                  {languages ? `${levelNames[level]} · ${LEVELS[level]}` : LEVELS[level]}
                </MenuItem>
              ))}
            </TextField>
            {optional ? null : (
              <TextField
                select
                size="small"
                label="Priority"
                value={skill.mustHave ? 'must' : 'nice'}
                onChange={(event) => update(skill.name, { mustHave: event.target.value === 'must' })}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="must">Must have</MenuItem>
                <MenuItem value="nice">Nice to have</MenuItem>
              </TextField>
            )}
            <Button size="small" onClick={() => onChange(skills.filter((item) => item.name !== skill.name))}>
              Remove
            </Button>
          </Stack>
        ))}
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label={languages ? 'Select a language from the catalog' : 'Select a skill from the catalog'}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            sx={{ minWidth: 280 }}
          >
            {available.map((item) => (
              <MenuItem key={item.name} value={item.name}>
                {item.name} ({item.category})
              </MenuItem>
            ))}
          </TextField>
          <Button size="small" variant="outlined" disabled={!selected} onClick={add}>
            {languages ? 'Add language' : 'Add skill'}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {hint}
      </Typography>
    </Box>
  );
};

export default DemandSkillList;
