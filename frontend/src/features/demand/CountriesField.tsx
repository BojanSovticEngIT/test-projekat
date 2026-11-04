import { Autocomplete, Chip, MenuItem, Stack, TextField } from '@mui/material';
import type { HrBusinessPartner } from '../../types/demand.types';
import type { CountrySelection } from './demandForm';
import { COUNTRIES } from './demandOptions';

interface CountriesFieldProps {
  value: CountrySelection[];
  partners: HrBusinessPartner[];
  onChange: (next: CountrySelection[]) => void;
}

// Countries the candidates may come from, each with one HR Business Partner. Leave it empty for any country.
function CountriesField({ value, partners, onChange }: CountriesFieldProps): JSX.Element {
  const setPartner = (country: string, hrBusinessPartnerId: string): void =>
    onChange(value.map((item) => (item.country === country ? { ...item, hrBusinessPartnerId } : item)));

  return (
    <Stack spacing={1.5}>
      <Autocomplete
        multiple
        fullWidth
        options={COUNTRIES}
        value={value.map((item) => item.country)}
        filterSelectedOptions
        onChange={(_, next) =>
          onChange(next.map((country) => value.find((item) => item.country === country) ?? { country, hrBusinessPartnerId: '' }))
        }
        renderTags={(selected, getTagProps) =>
          selected.map((item, index) => <Chip {...getTagProps({ index })} key={item} label={item} size="small" />)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            size="small"
            label="Candidate countries"
            helperText="Select the countries the people can come from. Leave empty for any country."
          />
        )}
      />
      {value.map((item) => (
        <TextField
          key={item.country}
          select
          required
          size="small"
          label={`HR Business Partner for ${item.country}`}
          value={partners.some((partner) => partner.id === item.hrBusinessPartnerId) ? item.hrBusinessPartnerId : ''}
          onChange={(event) => setPartner(item.country, event.target.value)}
          error={!item.hrBusinessPartnerId}
        >
          {partners.map((partner) => (
            <MenuItem key={partner.id} value={partner.id}>
              {partner.name}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </Stack>
  );
}

export default CountriesField;
