import { Autocomplete, Chip, TextField } from '@mui/material';

interface InterviewersFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  helperText?: string;
}

// Free text: type a name and press Enter to add it, then type the next one.
function InterviewersField({ value, onChange, helperText }: InterviewersFieldProps): JSX.Element {
  return (
    <Autocomplete
      multiple
      freeSolo
      fullWidth
      options={[]}
      value={value}
      onChange={(_, next) => onChange(next.map((name) => name.trim()).filter((name, index, all) => name && all.indexOf(name) === index))}
      renderTags={(selected, getTagProps) =>
        selected.map((name, index) => <Chip {...getTagProps({ index })} key={name} label={name} size="small" />)
      }
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Interviewers"
          helperText={helperText ?? 'Type a name and press Enter. Add as many as needed.'}
        />
      )}
    />
  );
}

export default InterviewersField;
