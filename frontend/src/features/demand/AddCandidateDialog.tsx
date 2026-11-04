import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useToast } from '../../lib/ToastProvider';
import type { DemandDetail } from '../../types/demand.types';
import { budgetCheck } from './candidateRules';
import { useAddCandidates, useCandidateOptions, useDemandCandidates } from './demandApi';
import { pluralize } from './demandFormat';
import { OtherDemandsList } from './OtherDemands';

interface AddCandidateDialogProps {
  demand: DemandDetail | null;
  onClose: () => void;
}

type Source = 'internal' | 'external';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalize = (value?: string): string => (value ?? '').trim().toLowerCase();

const EXCEPTION_REQUIRED = 'Explain why the above-budget candidate is accepted. The reason is required.';

// Names are not identities: the person is matched by selected identity or by email only.
const sameExternal = (
  a: { personId?: string; email?: string },
  b: { personId?: string; email?: string }
): boolean =>
  Boolean(a.personId && a.personId === b.personId) || Boolean(normalize(a.email) && normalize(a.email) === normalize(b.email));

const AddCandidateDialog = ({ demand, onClose }: AddCandidateDialogProps): JSX.Element => {
  const open = Boolean(demand);
  const { showToast } = useToast();
  const addCandidates = useAddCandidates();
  const options = useCandidateOptions(demand?.id, open);
  const candidates = useDemandCandidates(demand?.id);

  const [source, setSource] = useState<Source>('internal');
  const [selected, setSelected] = useState<string[]>([]);
  const [known, setKnown] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [recruiter, setRecruiter] = useState('');
  const [rate, setRate] = useState('');
  const [exception, setException] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSource('internal');
    setSelected([]);
    setKnown('');
    setName('');
    setEmail('');
    setRecruiter('');
    setRate('');
    setException('');
    setError(null);
  }, [demand?.id, open]);

  const limits = { maxRangeCode: demand?.maxRangeCode, maxDailyRate: demand?.maxDailyRate };
  const internalBudget = (costRange?: string) => budgetCheck({ type: 'INTERNAL', costRange }, limits);
  const typedRate = rate.trim() === '' ? undefined : Number(rate);
  const externalBudget = budgetCheck({ type: 'EXTERNAL', expectedDailyRate: Number.isFinite(typedRate) ? typedRate : undefined }, limits);
  const selectedOver = (options.data?.internal ?? []).filter(
    (person) => selected.includes(person.id) && internalBudget(person.costRange)?.over
  );
  const needsException = source === 'internal' ? selectedOver.length > 0 : Boolean(externalBudget?.over);

  const recruiters = options.data?.recruiters ?? [];
  const recruiterValue = recruiter || recruiters[0] || '';

  const personId = known ? options.data?.external[Number(known)]?.personId : undefined;
  const probe = { name: name.trim(), email: email.trim() || undefined, personId };
  const onThisDemand = useMemo(
    () => (candidates.data ?? []).find((item) => item.type === 'EXTERNAL' && sameExternal(probe, item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probe.personId, probe.email, candidates.data]
  );
  const onOtherDemands = useMemo(
    () => (options.data?.external ?? []).find((item) => sameExternal(probe, item)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [probe.personId, probe.email, options.data]
  );
  const sameNameOnly = useMemo(() => {
    if (onThisDemand || onOtherDemands || probe.name.length < 3) return undefined;
    const lower = probe.name.toLowerCase();
    return [...(candidates.data ?? []), ...(options.data?.external ?? [])].find(
      (item) => ('type' in item ? item.type === 'EXTERNAL' : true) && item.name.toLowerCase() === lower
    );
  }, [onThisDemand, onOtherDemands, probe.name, candidates.data, options.data]);

  const pickKnown = (value: string): void => {
    setKnown(value);
    const person = options.data?.external[Number(value)];
    setName(person?.name ?? '');
    setEmail(person?.email ?? '');
    if (person) setRecruiter(person.recruiter);
    setRate(person?.expectedDailyRate ? String(person.expectedDailyRate) : '');
    setError(null);
  };

  const toggle = (id: string): void => {
    setError(null);
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const fail = (mutationError: unknown): void => {
    if (axios.isAxiosError(mutationError) && (mutationError.response?.status === 409 || mutationError.response?.status === 400)) {
      setError((mutationError.response.data as { message?: string }).message ?? 'The candidate is already on this demand.');
      return;
    }
    setError(mutationError instanceof Error ? mutationError.message : 'Unable to add the candidate.');
  };

  const handleSubmit = async (): Promise<void> => {
    if (!demand) return;
    try {
      if (source === 'internal') {
        if (selected.length === 0) {
          setError('Select at least one person.');
          return;
        }
        if (needsException && !exception.trim()) {
          setError(EXCEPTION_REQUIRED);
          return;
        }
        await addCandidates.mutateAsync({
          id: demand.id,
          type: 'INTERNAL',
          employeeIds: selected,
          budgetException: needsException ? exception.trim() : undefined
        });
        showToast(
          `${pluralize(selected.length, 'candidate')} added.${selectedOver.length > 0 ? ' Some are above the budget of the demand.' : ''} Add a step to start the process.`
        );
      } else {
        if (!probe.name) {
          setError('Enter the full name.');
          return;
        }
        if (probe.email && !EMAIL_PATTERN.test(probe.email)) {
          setError('Enter a valid email.');
          return;
        }
        if (onThisDemand) {
          setError(`${onThisDemand.name} is already a candidate on this demand.`);
          return;
        }
        const dailyRate = rate.trim() === '' ? undefined : Number(rate);
        if (dailyRate !== undefined && (!Number.isFinite(dailyRate) || dailyRate < 0)) {
          setError('The daily rate must be zero or more.');
          return;
        }
        if (needsException && !exception.trim()) {
          setError(EXCEPTION_REQUIRED);
          return;
        }
        await addCandidates.mutateAsync({
          id: demand.id,
          type: 'EXTERNAL',
          personId: onOtherDemands?.personId,
          name: onOtherDemands?.name ?? probe.name,
          email: probe.email,
          recruiter: recruiterValue,
          expectedDailyRate: dailyRate,
          budgetException: needsException ? exception.trim() : undefined
        });
        showToast(
          `${probe.name} added.${externalBudget?.over ? ' The rate is above the budget of the demand.' : ''}${onOtherDemands ? ` This person is also a candidate on ${onOtherDemands.otherDemands.map((link) => link.demandCode).join(', ')}.` : ''}`
        );
      }
      onClose();
    } catch (mutationError) {
      fail(mutationError);
    }
  };

  const internal = options.data?.internal ?? [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add candidate</DialogTitle>
      <DialogContent>
        <Tabs
          value={source}
          onChange={(_, value: Source) => {
            setSource(value);
            setError(null);
          }}
          sx={{ mb: 2 }}
        >
          <Tab value="internal" label="Find candidates (internal)" />
          <Tab value="external" label="External candidate" />
        </Tabs>

        {options.isLoading ? (
          <CircularProgress size={24} aria-label="Loading" />
        ) : options.isError ? (
          <Alert severity="error">Unable to load the candidate options.</Alert>
        ) : source === 'internal' ? (
          <Stack spacing={1.5}>
            <Alert severity="info">
              <strong>Mock of Module 4 (Search).</strong> It shows people on the bench, people with free capacity, and
              people whose allocation ends in the next 3 months. The real search is out of scope for Module 3.
            </Alert>
            <Stack component="ul" spacing={0.5} sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {internal.map((person) => (
                <li key={person.id}>
                  <FormControlLabel
                    disabled={person.alreadyOnDemand}
                    control={
                      <Checkbox
                        checked={selected.includes(person.id)}
                        onChange={() => toggle(person.id)}
                        inputProps={{ 'aria-label': person.name }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          <strong>{person.name}</strong> · {person.availability}
                          {person.costRange ? ` · ${person.costRange}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {person.title} · line manager {person.lineManager}
                          {person.alreadyOnDemand ? ' · already a candidate on this demand' : ''}
                        </Typography>
                        {internalBudget(person.costRange)?.over ? (
                          <Typography variant="caption" color="warning.dark" component="div">
                            Above budget: {person.costRange}, maximum {demand?.maxRangeCode}
                          </Typography>
                        ) : null}
                        {person.otherDemands.length > 0 ? (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" component="div">
                              Also on {pluralize(person.otherDemands.length, 'other demand')}
                            </Typography>
                            <OtherDemandsList links={person.otherDemands} />
                          </Box>
                        ) : null}
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </li>
              ))}
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              A person from the market, found by a recruiter. External candidates get the extra step &quot;Offer
              sent&quot;.
            </Typography>
            {(options.data?.external.length ?? 0) > 0 ? (
              <TextField
                select
                label="Existing external person"
                value={known}
                onChange={(event) => pickKnown(event.target.value)}
                helperText="One person can be a candidate on several demands. Select the person to use the same data."
                fullWidth
              >
                <MenuItem value="">A new person</MenuItem>
                {options.data?.external.map((person, index) => (
                  <MenuItem key={person.personId} value={String(index)}>
                    {person.name}
                    {person.email ? ` (${person.email})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {onThisDemand ? (
              <Alert severity="error">
                <strong>Already on this demand.</strong> {onThisDemand.name} is a candidate here: {onThisDemand.currentStep}.
              </Alert>
            ) : onOtherDemands ? (
              <Alert severity="info">
                <strong>{onOtherDemands.name} is on other demands.</strong> You can add the person here too. The existing
                person is reused, with their own flow on each demand.
                <Box sx={{ mt: 1 }}>
                  <OtherDemandsList links={onOtherDemands.otherDemands} />
                </Box>
              </Alert>
            ) : sameNameOnly ? (
              <Alert severity="warning">
                A person named {sameNameOnly.name} already exists. Names are not unique, so you can still add this one as a
                different person.
              </Alert>
            ) : null}
            <TextField label="Full name" value={name} onChange={(event) => {
                setKnown('');
                setName(event.target.value);
              }}
              required fullWidth />
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => {
                setKnown('');
                setEmail(event.target.value);
              }}
              fullWidth
            />
            <TextField
              select
              label="Recruiter"
              value={recruiterValue}
              onChange={(event) => setRecruiter(event.target.value)}
              fullWidth
            >
              {recruiters.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Expected daily rate (EUR)"
              type="number"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              inputProps={{ min: 0, step: 10 }}
              helperText={demand?.maxDailyRate ? `The maximum for this demand is ${demand.maxDailyRate} EUR.` : undefined}
              fullWidth
            />
            {externalBudget?.over ? (
              <Alert severity="warning">
                <strong>Above budget.</strong> Expected {externalBudget.actual}, maximum {externalBudget.max}.
              </Alert>
            ) : null}
          </Stack>
        )}
        {needsException ? (
          <TextField
            label="Reason for the budget exception"
            value={exception}
            onChange={(event) => {
              setException(event.target.value);
              if (error === EXCEPTION_REQUIRED) setError(null);
            }}
            required
            error={error === EXCEPTION_REQUIRED}
            helperText={
              source === 'internal'
                ? 'Required. Saved as a candidate note on each above-budget candidate of this demand. The candidate is not rejected.'
                : 'Required. Saved as a candidate note on this demand. The candidate is not rejected.'
            }
            multiline
            minRows={2}
            fullWidth
            sx={{ mt: 2 }}
          />
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={addCandidates.isPending || options.isLoading || (source === 'external' && Boolean(onThisDemand))}
        >
          {source === 'internal' ? 'Add selected' : 'Add candidate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddCandidateDialog;
