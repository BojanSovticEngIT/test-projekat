import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Paper,
  Typography,
  alpha,
  type Theme
} from '@mui/material';
import { WorkforcePageHeader } from '../../components';
import { useToast } from '../../lib/ToastProvider';
import { useCreateDemand, useHrBusinessPartners, useUpdateDemand } from './demandApi';
import { buildSampleEmail, parseDemandEmail, type EmailField } from './demandEmailParser';
import CountriesField from './CountriesField';
import OptionsField from './OptionsField';
import InterviewersField from './InterviewersField';
import { EmailFileError, readEmailFile } from './demandEmailFile';
import { emptyValues, isEmpty, toValues, validate, type FormValues } from './demandForm';
import DemandSkillList from './DemandSkillList';
import { HORIZONTALS, RANGE_CODES, VERTICALS } from './demandOptions';
import type { DemandCreateRequest, DemandDetail, DemandUpdateRequest } from '../../types/demand.types';

interface DemandEditorProps {
  // Set to edit this demand. Without it the form adds a new demand.
  demand?: DemandDetail;
}

// One form page for adding and editing a demand.
function DemandEditor({ demand }: DemandEditorProps): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const isEdit = Boolean(demand);
  const createDemand = useCreateDemand();
  const hrPartners = useHrBusinessPartners();
  const updateDemand = useUpdateDemand();
  const [values, setValues] = useState<FormValues>(() => (demand ? toValues(demand) : emptyValues()));
  const [showMissing, setShowMissing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // The exact text that autofill read. It is saved as the original request (D-15).
  const [source, setSource] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [unmatched, setUnmatched] = useState<Partial<Record<EmailField, string>>>({});
  const [missingSkills, setMissingSkills] = useState<string[]>(demand?.missingSkills ?? []);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((current) => ({ ...current, [key]: value }));
    setDuplicate(null);
  };

  // Back to the page the user came from. A direct link has no previous page in the app.
  const goBack = (): void => {
    if (location.key !== 'default') navigate(-1);
    else navigate(demand ? `/demands/${demand.id}` : '/demands');
  };

  const autofill = (text = sourceText): void => {
    const parsed = parseDemandEmail(text);
    // Autofill only prepares the form. Nothing is saved until the user selects "Save demand" (D-14).
    setValues({
      ...emptyValues(),
      ...parsed.values,
      horizontals: parsed.values.horizontal ? [parsed.values.horizontal] : [],
      verticals: parsed.values.vertical ? [parsed.values.vertical] : [],
      interviewers: parsed.interviewers.filter((name, index, all) => all.indexOf(name) === index),
      skills: parsed.skills
    });
    setFilled(parsed.filled);
    setUnmatched(parsed.unmatched);
    setMissingSkills(parsed.missingSkills);
    setSource(text);
    setFileError(null);
    setParsedCount(parsed.filled.size);
    setShowMissing(true);
    setErrors([]);
    setDuplicate(null);
  };

  const importFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const text = await readEmailFile(file);
      setSourceText(text);
      autofill(text);
    } catch (error) {
      setFileError(error instanceof EmailFileError ? error.message : 'Cannot read the file. Paste the text instead.');
    }
  };

  const fillSample = (): void => {
    setSourceText(buildSampleEmail());
  };

  const renderListField = (key: 'horizontals' | 'verticals', emailKey: 'horizontal' | 'vertical', label: string, options: string[]) => {
    const missing = showMissing && isEmpty(values, key);
    const fromEmail = filled.has(emailKey);
    const unmatchedText = unmatched[emailKey];
    return (
      <OptionsField
        label={label}
        options={options}
        value={values[key][0] ?? null}
        required
        error={missing}
        fromEmail={fromEmail}
        onChange={(next) => set(key, next ? [next] : [])}
        helperText={
          missing
            ? parsedCount !== null
              ? 'Not found in the email. Fill this field.'
              : 'Select one.'
            : unmatchedText && values[key].length === 0
              ? `The email says "${unmatchedText}". Select the matching value.`
              : fromEmail
                ? 'From email.'
                : undefined
        }
      />
    );
  };

  const fieldProps = (key: keyof FormValues, label: string, required = false, hint?: string) => {
    const missing = showMissing && required && isEmpty(values, key);
    const fromEmail = filled.has(key);
    const unmatchedText = unmatched[key as EmailField];
    const message = missing
      ? parsedCount !== null
        ? 'Not found in the email. Fill this field.'
        : 'Required.'
      : unmatchedText && !values[key]
        ? `The email says "${unmatchedText}". Select the matching value.`
        : [fromEmail ? 'From email.' : null, hint].filter(Boolean).join(' ') || undefined;
    return {
      label,
      required,
      size: 'small' as const,
      fullWidth: true,
      value: values[key] as string,
      error: missing,
      helperText: message,
      sx: fromEmail
        ? { '& .MuiOutlinedInput-root': { bgcolor: (theme: Theme) => alpha(theme.palette.info.main, 0.08) } }
        : undefined,
      onChange: (event: { target: { value: string } }) => set(key, event.target.value as never)
    };
  };

  const save = async (force: boolean): Promise<void> => {
    const found = validate(values);
    if (found.length > 0) {
      setShowMissing(true);
      setErrors(found);
      setDuplicate(null);
      return;
    }
    const shared = {
      externalId: values.externalId.trim() || undefined,
      title: values.title.trim(),
      skills: values.skills,
      optionalSkills: values.optionalSkills,
      missingSkills,
      seniority: values.seniority.trim() || undefined,
      allocationPct: parseInt(values.allocation, 10),
      maxRangeCode: values.rangeCode || undefined,
      maxDailyRate: parseInt(values.maxRate, 10) || undefined,
      requestedBy: values.requestedBy.trim(),
      interviewers: values.interviewers,
      receivedDate: values.received,
      wantedStartDate: values.start,
      wantedEndDate: values.end || undefined,
      horizontals: values.horizontals,
      verticals: values.verticals,
      clientName: values.client.trim() || undefined,
      projectName: values.project.trim() || undefined,
      projectDescription: values.projectDescription.trim() || undefined,
      countries: values.countries.map((item) => ({ country: item.country, hrBusinessPartnerId: item.hrBusinessPartnerId })),
      force
    };
    try {
      if (demand) {
        const request: DemandUpdateRequest = shared;
        const updated = await updateDemand.mutateAsync({ id: demand.id, request });
        const changes = updated.history.length - demand.history.length;
        showToast(changes > 0 ? `Saved ${changes} change${changes === 1 ? '' : 's'} to ${demand.code}.` : 'No changes to save.');
        goBack();
        return;
      }
      const request: DemandCreateRequest = {
        ...shared,
        requestedPositions: parseInt(values.requested, 10),
        notes: values.notes.trim() || undefined,
        originalRequest: source || undefined,
        autofilledFields: source ? (parsedCount ?? 0) : undefined
      };
      const created = await createDemand.mutateAsync(request);
      navigate('/demands?page=0', { state: { created: { id: created.id, code: created.code } } });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setErrors([]);
        setDuplicate((error.response.data as { duplicateCode?: string }).duplicateCode ?? 'Another demand');
        return;
      }
      setErrors([error instanceof Error ? error.message : 'Unable to save the demand.']);
    }
  };

  const dateProps = (key: 'received' | 'start' | 'end', label: string, required: boolean) => ({
    ...fieldProps(key, label, required),
    type: 'date',
    InputLabelProps: { shrink: true }
  });

  return (
    <Box>
      <WorkforcePageHeader
        title={demand ? `Edit ${demand.code}` : 'New demand'}
        description={
          demand
            ? 'Change the demand data. The history records each changed field with the old and the new value. Candidates and positions do not change here.'
            : undefined
        }
        breadcrumbs={
          demand
            ? [{ label: 'Demands', to: '/demands' }, { label: demand.code, to: `/demands/${demand.id}` }, { label: 'Edit' }]
            : [{ label: 'Demands', to: '/demands' }, { label: 'New demand' }]
        }
      />

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, maxWidth: 960 }}>
        {!isEdit ? (
          <>
        <Typography variant="subtitle1" component="h3" sx={{ mb: 0.5 }}>
          1. Paste the request
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 1.5 }}>
          Paste the automatic email from the demand application, or drop a .txt or .eml file on the box. Autofill reads labelled lines such as &quot;Start
          date: 01/12/2026&quot;. You can also skip this and fill the form by hand.
        </Typography>
        <Box
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes('Files')) return;
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void importFile(event.dataTransfer.files[0]);
          }}
          sx={{
            p: 1.25,
            border: 2,
            borderStyle: 'dashed',
            borderRadius: 1,
            borderColor: dragOver ? 'primary.main' : 'divider',
            bgcolor: (theme) => (dragOver ? alpha(theme.palette.primary.main, 0.08) : 'transparent'),
            display: 'grid',
            gap: 1.25
          }}
        >
          <TextField
            label="Email text"
            placeholder="Paste the email text here, or drop a .txt or .eml file on this box."
            value={sourceText}
            onChange={(event) => {
              setSourceText(event.target.value);
              setFileError(null);
            }}
            multiline
            minRows={6}
            maxRows={12}
            fullWidth
            inputProps={{ style: { fontFamily: 'monospace', fontSize: 12 } }}
          />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" disabled={!sourceText.trim()} onClick={() => autofill()}>
              Fill the form from the text
            </Button>
            <Button size="small" variant="outlined" component="label">
              Choose file
              <input
                type="file"
                hidden
                accept=".txt,.eml,text/plain,message/rfc822"
                onChange={(event) => {
                  void importFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </Button>
            <Button size="small" onClick={fillSample}>
              Use a sample email
            </Button>
          </Stack>
        </Box>
        {fileError ? (
          <Alert severity="error" sx={{ mt: 1.5 }} onClose={() => setFileError(null)}>
            {fileError}
          </Alert>
        ) : null}
        {parsedCount !== null ? (
          <Alert severity={parsedCount > 0 ? 'info' : 'warning'} sx={{ mt: 1.5 }}>
            {parsedCount > 0
              ? `Autofill filled ${parsedCount} field${parsedCount === 1 ? '' : 's'} from the pasted text. Blue fields come from the email. Red fields are missing. Nothing is saved until you select "Save demand".`
              : 'Autofill found no labelled lines. Fill the form by hand.'}
          </Alert>
        ) : null}
          </>
        ) : null}
        <Typography variant="subtitle1" component="h3" sx={{ mt: isEdit ? 0 : 3, mb: 0.5 }}>
          {isEdit ? 'Demand data' : '2. Check the demand'}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {isEdit ? 'Change the values you need and save.' : 'Check every value and correct it if needed.'}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField {...fieldProps('externalId', 'Workforce ID', false, 'ID from the Italian demand application.')} />
          <TextField {...fieldProps('title', 'Role / title', true)} />
          <DemandSkillList
            label="Required skills (Module 1 skill catalog) *"
            hint="Levels are the Module 1 knowledge levels. Bold in the details page means must have."
            languages={false}
            skills={values.skills}
            excluded={values.optionalSkills.map((skill) => skill.name)}
            error={showMissing && isEmpty(values, 'skills')}
            fromEmail={filled.has('skills')}
            onChange={(next) => set('skills', next)}
          />
          {missingSkills.length > 0 ? (
            <Alert
              severity="warning"
              sx={{ gridColumn: '1 / -1' }}
              action={
                <Button color="inherit" size="small" onClick={() => setMissingSkills([])}>
                  Ignore them
                </Button>
              }
            >
              <strong>Not in the skill catalog:</strong>{' '}
              {missingSkills.map((name) => (
                <Chip key={name} label={name} size="small" variant="outlined" sx={{ mr: 0.5, borderStyle: 'dashed' }} />
              ))}
              <Typography variant="caption" display="block">
                The demand keeps them as requested skills. It cannot match on them until Module 1 adds them.
              </Typography>
            </Alert>
          ) : null}
          <DemandSkillList
            label="Required languages (Module 1 skill catalog)"
            hint="Languages are skills in the Languages category of Module 1, with the same levels. B1 = Intermediate, B2 = Experienced, C1 = Advanced, C2 = Master."
            languages
            skills={values.skills}
            error={false}
            fromEmail={filled.has('languages')}
            onChange={(next) => set('skills', next)}
          />
          <DemandSkillList
            label="Optional skills (Module 1 skill catalog)"
            hint="Nice to have. They do not count as required and have no must-have flag."
            languages={false}
            optional
            skills={values.optionalSkills}
            excluded={values.skills.map((skill) => skill.name)}
            error={false}
            onChange={(next) => set('optionalSkills', next)}
          />
          <TextField {...fieldProps('seniority', 'Seniority')} />
          <TextField
            {...fieldProps('requested', 'Number of people', true)}
            type="number"
            inputProps={{ min: 1, max: 50 }}
            // Positions change with Add positions and Cancel positions.
            disabled={isEdit}
          />
          <TextField
            {...fieldProps('allocation', 'Allocation % per person', true)}
            type="number"
            inputProps={{ min: 1, max: 100 }}
          />
          <TextField {...fieldProps('rangeCode', 'Max cost range code', false, 'Module 2 workforce cost code.')} select>
            <MenuItem value="">Not set</MenuItem>
            {RANGE_CODES.map((code) => (
              <MenuItem key={code} value={code}>
                {code}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...fieldProps('maxRate', 'Max daily rate (EUR)', false, 'Budget for external candidates.')}
            type="number"
            inputProps={{ min: 0, max: 5000 }}
          />
          <TextField {...fieldProps('requestedBy', 'Requested by', true)} />
          <InterviewersField
            value={values.interviewers}
            onChange={(next) => set('interviewers', next)}
            helperText={filled.has('interviewer') ? 'From email.' : undefined}
          />
          <TextField {...dateProps('received', 'Date received', true)} />
          <TextField {...dateProps('start', 'Start date', true)} />
          <TextField {...dateProps('end', 'End date', false)} />
          {renderListField('horizontals', 'horizontal', 'Horizontal (Module 2)', HORIZONTALS)}
          <TextField {...fieldProps('project', 'Project name', false, 'Free text. Most demands are for new projects.')} />
          {renderListField('verticals', 'vertical', 'Vertical (Module 2)', VERTICALS)}
          <TextField {...fieldProps('client', 'Client')} />
          <CountriesField value={values.countries} partners={hrPartners.data ?? []} onChange={(next) => set('countries', next)} />
          <TextField
            {...fieldProps('projectDescription', 'Project description')}
            multiline
            minRows={2}
            sx={{ ...fieldProps('projectDescription', 'Project description').sx, gridColumn: '1 / -1' }}
          />
          {!isEdit ? (
            <TextField
              {...fieldProps('notes', 'Notes')}
              multiline
              minRows={3}
              sx={{ ...fieldProps('notes', 'Notes').sx, gridColumn: '1 / -1' }}
            />
          ) : null}
        </Box>

      <Stack spacing={1.5} sx={{ mt: 3 }}>
        {errors.length > 0 ? (
          <Alert severity="error">
            <strong>Cannot save.</strong> {errors.join(' ')}
          </Alert>
        ) : null}
        {duplicate ? (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => void save(true)}>
                Save anyway
              </Button>
            }
          >
            <strong>Possible duplicate.</strong> {duplicate} already uses this Workforce ID.
          </Alert>
        ) : null}
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={goBack}>Cancel</Button>
          <Button variant="contained" disabled={createDemand.isPending || updateDemand.isPending} onClick={() => void save(false)}>
            Save demand
          </Button>
        </Stack>
      </Stack>
      </Paper>
    </Box>
  );
}

export default DemandEditor;
