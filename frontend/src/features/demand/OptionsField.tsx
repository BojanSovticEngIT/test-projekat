import { Autocomplete, TextField } from '@mui/material';

interface OptionsFieldProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (next: string | null) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fromEmail?: boolean;
}

// Single choice from a fixed list. Used for the horizontal and the vertical.
function OptionsField({ label, options, value, onChange, required, error, helperText, fromEmail }: OptionsFieldProps): JSX.Element {
  return (
    <Autocomplete
      fullWidth
      options={options}
      value={value}
      onChange={(_, next) => onChange(next)}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label={label}
          required={required}
          error={error}
          helperText={helperText}
          sx={fromEmail ? { '& .MuiOutlinedInput-root': { bgcolor: (theme) => `${theme.palette.info.main}14` } } : undefined}
        />
      )}
    />
  );
}

export default OptionsField;
