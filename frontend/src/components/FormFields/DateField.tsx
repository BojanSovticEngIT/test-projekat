import { TextField } from '@mui/material';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

const today = (): string => new Date().toISOString().split('T')[0];

const DateField = ({
  value,
  onChange,
  label = 'Last Used Date',
  error,
  helperText,
  required,
  disabled
}: DateFieldProps): JSX.Element => (
  <TextField
    fullWidth
    type="date"
    label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    inputProps={{ max: today() }}
    InputLabelProps={{ shrink: true }}
    error={error}
    helperText={helperText}
    required={required}
    disabled={disabled}
  />
);

export default DateField;
