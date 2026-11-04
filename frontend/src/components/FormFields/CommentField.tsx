import { TextField } from '@mui/material';

const MAX_CHARS = 2000;

interface CommentFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
}

const CommentField = ({
  value,
  onChange,
  label = 'Comment',
  error,
  helperText,
  required,
  disabled,
  rows = 3
}: CommentFieldProps): JSX.Element => (
  <TextField
    fullWidth
    multiline
    rows={rows}
    label={label}
    value={value}
    onChange={(event) => onChange(event.target.value.slice(0, MAX_CHARS))}
    inputProps={{ maxLength: MAX_CHARS }}
    helperText={helperText ?? `${value.length}/${MAX_CHARS}`}
    error={error}
    required={required}
    disabled={disabled}
  />
);

export default CommentField;
