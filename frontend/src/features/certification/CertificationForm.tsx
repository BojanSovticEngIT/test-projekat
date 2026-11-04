import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { Alert, Autocomplete, Box, Button, FormHelperText, Paper, Stack, TextField, Typography } from '@mui/material';
import { DateField } from '../../components';
import { SkillStatus } from '../../types/enums';
import type { CertificationSkill, MyCertificationRequest } from '../../types/certification.types';
import { useSkills } from '../skill/skillApi';
import { isPdfFile, PDF_ERROR, validateCertification } from './certificationForm';
import type { CertificationFormErrors, CertificationFormValues } from './certificationForm';

interface CertificationFormProps {
  initialValues?: { name: string; completionDate: string; expirationDate?: string | null; skills: CertificationSkill[]; documentFileName?: string | null; link?: string | null };
  submitLabel: string;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (request: MyCertificationRequest) => Promise<void>;
}

const MAX_SKILL_OPTIONS = 100;

const CertificationForm = ({ initialValues, submitLabel, saving, onCancel, onSubmit }: CertificationFormProps): JSX.Element => {
  const [values, setValues] = useState<CertificationFormValues>({
    name: initialValues?.name ?? '',
    completionDate: initialValues?.completionDate.slice(0, 10) ?? '',
    expirationDate: initialValues?.expirationDate?.slice(0, 10) ?? '',
    skillIds: initialValues?.skills.map((skill) => skill.id) ?? [],
    link: initialValues?.link ?? '',
    file: null
  });
  const [errors, setErrors] = useState<CertificationFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: skillsPage, isLoading: skillsLoading, isError: skillsError } = useSkills({
    status: SkillStatus.ACTIVE,
    size: MAX_SKILL_OPTIONS
  });
  // Keep skills already linked to the certification selectable even when they are missing from the active list.
  const skillOptions = [
    ...(skillsPage?.content ?? []).map((skill) => ({ id: skill.id, name: skill.name })),
    ...(initialValues?.skills ?? [])
  ].filter((skill, index, all) => all.findIndex((other) => other.id === skill.id) === index);
  const selectedSkills = skillOptions.filter((skill) => values.skillIds.includes(skill.id));

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;
    setValues((current) => ({ ...current, file }));
    setErrors((current) => ({ ...current, file: isPdfFile(file) ? undefined : PDF_ERROR, source: undefined }));
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitError(null);
    const nextErrors = validateCertification(values, Boolean(initialValues?.documentFileName));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    try {
      await onSubmit({
        name: values.name.trim(),
        completionDate: values.completionDate,
        expirationDate: values.expirationDate || undefined,
        skillIds: values.skillIds,
        link: values.link.trim(),
        file: values.file ?? undefined
      });
    } catch (error) {
      setSubmitError(
        axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : error instanceof Error
            ? error.message
            : 'Unable to save the certification.'
      );
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, maxWidth: 720 }}>
      <Box component="form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <Stack spacing={3}>
          <TextField
            label="Certification name"
            value={values.name}
            onChange={(event) => {
              setValues((current) => ({ ...current, name: event.target.value }));
              setErrors((current) => ({ ...current, name: undefined }));
            }}
            error={Boolean(errors.name)}
            helperText={errors.name}
            required
            fullWidth
          />

          <DateField
            label="Completion date"
            value={values.completionDate}
            onChange={(completionDate) => {
              setValues((current) => ({ ...current, completionDate }));
              setErrors((current) => ({ ...current, completionDate: undefined }));
            }}
            error={Boolean(errors.completionDate)}
            helperText={errors.completionDate}
            required
          />

          <TextField
            label="Expiration date"
            type="date"
            value={values.expirationDate}
            onChange={(event) => {
              setValues((current) => ({ ...current, expirationDate: event.target.value }));
              setErrors((current) => ({ ...current, expirationDate: undefined }));
            }}
            InputLabelProps={{ shrink: true }}
            error={Boolean(errors.expirationDate)}
            helperText={errors.expirationDate ?? 'Optional. Leave empty if the certificate does not expire.'}
            fullWidth
          />

          <Autocomplete
            multiple
            options={skillOptions}
            loading={skillsLoading}
            value={selectedSkills}
            getOptionLabel={(skill) => skill.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, selected) => setValues((current) => ({ ...current, skillIds: selected.map((skill) => skill.id) }))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Associated skills"
                helperText={skillsError ? 'Unable to load skills.' : 'Optional. Select existing skills this certification relates to.'}
                error={skillsError}
              />
            )}
          />

          <TextField
            label="Certificate link"
            type="url"
            value={values.link}
            onChange={(event) => {
              setValues((current) => ({ ...current, link: event.target.value }));
              setErrors((current) => ({ ...current, link: undefined, source: undefined }));
            }}
            error={Boolean(errors.link || errors.source)}
            helperText={errors.link ?? errors.source ?? 'Add a PDF, a link, or both. At least one is required.'}
            placeholder="https://"
            fullWidth
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Certificate PDF
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component="label" variant="outlined" startIcon={<PictureAsPdfOutlinedIcon />}>
                {initialValues?.documentFileName ? 'Replace PDF' : 'Select PDF'}
                <input
                  type="file"
                  hidden
                  accept="application/pdf,.pdf"
                  aria-label="Certificate PDF"
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {values.file?.name ??
                  (initialValues?.documentFileName ? `Current file: ${initialValues.documentFileName}` : 'No file selected')}
              </Typography>
            </Stack>
            {errors.file ? <FormHelperText error>{errors.file}</FormHelperText> : null}
          </Box>

          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {submitLabel}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Paper>
  );
};

export default CertificationForm;
