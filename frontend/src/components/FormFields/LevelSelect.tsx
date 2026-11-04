import { FormControl, FormHelperText, InputLabel, MenuItem, Select } from '@mui/material';
import { KnowledgeLevel } from '../../types/enums';

const LEVEL_OPTIONS: { value: number; label: string }[] = [
  { value: KnowledgeLevel.BEGINNER, label: '1 — Beginner' },
  { value: KnowledgeLevel.INTERMEDIATE, label: '2 — Intermediate' },
  { value: KnowledgeLevel.EXPERIENCED, label: '3 — Experienced' },
  { value: KnowledgeLevel.ADVANCED, label: '4 — Advanced' },
  { value: KnowledgeLevel.MASTER, label: '5 — Master' }
];

interface LevelSelectProps {
  value: number | '';
  onChange: (value: number) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

const LevelSelect = ({
  value,
  onChange,
  label = 'Knowledge Level',
  error,
  helperText,
  required,
  disabled
}: LevelSelectProps): JSX.Element => (
  <FormControl fullWidth error={error} required={required} disabled={disabled}>
    <InputLabel>{label}</InputLabel>
    <Select value={value} label={label} onChange={(event) => onChange(Number(event.target.value))}>
      {LEVEL_OPTIONS.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
    {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
  </FormControl>
);

export default LevelSelect;
