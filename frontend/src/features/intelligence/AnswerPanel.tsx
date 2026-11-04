import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CompareAnswer, MatchAnswer, QueryAnswer, StatAnswer } from '../../types/intelligence.types';

const STEPS = ['Reading the question', 'Extracting criteria', 'Validating against the catalogue', 'Querying workforce data'];

// Simulated "AI is working" state: shows the pipeline steps while the interpretation request runs.
export function AiThinking({ active }: { active: boolean }): JSX.Element | null {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) {
      setStep(0);
      return undefined;
    }
    const timer = window.setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 220);
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }} role="status" aria-live="polite">
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <CircularProgress size={18} />
        <Typography fontWeight={600}>Interpreting your request…</Typography>
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 0.5, md: 2 }}>
        {STEPS.map((label, index) => (
          <Stack key={label} direction="row" spacing={0.5} alignItems="center">
            {index < step ? <CheckCircleIcon color="success" fontSize="small" /> : <RadioButtonUncheckedIcon color={index === step ? 'primary' : 'disabled'} fontSize="small" />}
            <Typography variant="body2" color={index <= step ? 'text.primary' : 'text.secondary'}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function HowCalculated({ answer }: { answer: StatAnswer | CompareAnswer }): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <Box sx={{ mt: 1.5 }}>
      <Button size="small" startIcon={<InfoOutlinedIcon />} onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? 'Hide how this was calculated' : 'How this was calculated'}
      </Button>
      <Collapse in={open}>
        <Box sx={{ mt: 1, pl: 1 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Denominator:</strong> {answer.population.definition}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            {answer.population.excluded.map((item) => (
              <Chip key={item.label} size="small" variant="outlined" label={`Not counted — ${item.label}: ${item.count}`} />
            ))}
          </Stack>
          {answer.notes.map((note) => (
            <Typography key={note} variant="body2" color="text.secondary">
              • {note}
            </Typography>
          ))}
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Calculated by the backend from the criteria above, as of {answer.asOf}. The AI only interprets the question; it never produces the numbers.
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}

function StatView({ answer, onShowPeople }: { answer: StatAnswer; onShowPeople: () => void }): JSX.Element {
  const percentFirst = answer.headline === 'PERCENTAGE';
  const max = Math.max(1, ...(answer.breakdown?.rows.map((row) => row.count) ?? [1]));
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={answer.lenses.length || answer.breakdown ? 5 : 12}>
        <Typography variant="overline" color="text.secondary">
          {answer.subject}
        </Typography>
        <Typography variant="h3" fontWeight={700} color="primary" lineHeight={1.1}>
          {percentFirst ? `${answer.percentage}%` : answer.count}
        </Typography>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          {percentFirst ? (
            <>
              <strong>{answer.count}</strong> of {answer.population.label}
            </>
          ) : (
            <>
              <strong>{answer.percentage}%</strong> of {answer.population.label}
            </>
          )}
        </Typography>
        <Button size="small" variant="outlined" sx={{ mt: 1.5 }} onClick={onShowPeople} disabled={!answer.count}>
          Show the {answer.count} {answer.count === 1 ? 'person' : 'people'}
        </Button>
        <HowCalculated answer={answer} />
      </Grid>
      {answer.lenses.length || answer.breakdown ? (
        <Grid item xs={12} md={7}>
          {answer.lenses.length ? (
            <>
              <Typography variant="subtitle2" gutterBottom>
                It depends on the definition
              </Typography>
              <Table size="small" aria-label="Alternative definitions">
                <TableHead>
                  <TableRow>
                    <TableCell>Definition</TableCell>
                    <TableCell align="right">People</TableCell>
                    <TableCell align="right">Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {answer.lenses.map((lens) => (
                    <TableRow key={lens.key} selected={lens.isDefault}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={lens.isDefault ? 700 : 400}>
                          {lens.label} {lens.isDefault ? <Chip size="small" color="primary" label="used above" sx={{ ml: 0.5 }} /> : null}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lens.definition}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{lens.count}</TableCell>
                      <TableCell align="right">{lens.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          ) : null}
          {answer.breakdown ? (
            <Box sx={{ mt: answer.lenses.length ? 2 : 0 }}>
              <Typography variant="subtitle2" gutterBottom>
                {answer.breakdown.title}
              </Typography>
              <Stack spacing={0.75}>
                {answer.breakdown.rows.map((row) => (
                  <Box key={row.label}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">
                        {row.label}
                        {row.detail ? (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}
                            · {row.detail}
                          </Typography>
                        ) : null}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {row.count}
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={(100 * row.count) / max} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Grid>
      ) : null}
    </Grid>
  );
}

function CompareView({ answer, onShowPeople }: { answer: CompareAnswer; onShowPeople: () => void }): JSX.Element {
  const max = Math.max(1, ...answer.rows.map((row) => row.count));
  return (
    <Box>
      <Typography variant="overline" color="text.secondary">
        Comparison · {answer.population.label}
      </Typography>
      <Table size="small" aria-label="Technology comparison">
        <TableHead>
          <TableRow>
            <TableCell>Technology</TableCell>
            <TableCell align="right">People</TableCell>
            <TableCell align="right">Share of workforce</TableCell>
            <TableCell align="right">Advanced (4+)</TableCell>
            <TableCell align="right">Avg. years</TableCell>
            <TableCell align="right">Available now</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {answer.rows.map((row) => (
            <TableRow key={row.skillId}>
              <TableCell sx={{ minWidth: 160 }}>
                <Typography variant="body2" fontWeight={600}>
                  {row.label}
                </Typography>
                <LinearProgress variant="determinate" value={(100 * row.count) / max} sx={{ height: 6, borderRadius: 3, mt: 0.5 }} />
              </TableCell>
              <TableCell align="right">{row.count}</TableCell>
              <TableCell align="right">{row.percentage}%</TableCell>
              <TableCell align="right">{row.advanced}</TableCell>
              <TableCell align="right">{row.avgYears ?? '—'}</TableCell>
              <TableCell align="right">{row.availableNow}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {answer.both} {answer.both === 1 ? 'person has' : 'people have'} all of them · {answer.either} have at least one.
      </Typography>
      <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={onShowPeople}>
        Show the {answer.either} people
      </Button>
      <HowCalculated answer={answer} />
    </Box>
  );
}

function MatchView({ answer }: { answer: MatchAnswer }): JSX.Element {
  const navigate = useNavigate();
  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Must-have / optional matching
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {answer.eligibleCount} eligible of {answer.evaluated} evaluated
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {answer.notEligibleCount} {answer.notEligibleCount === 1 ? 'person fails' : 'people fail'} at least one must-have and get no score.
          </Typography>
        </Box>
        <Box>
          <Button variant="contained" endIcon={<OpenInNewIcon />} onClick={() => navigate('/intelligence/matching', { state: { demand: answer.demand } })}>
            Open in Demand matching
          </Button>
        </Box>
      </Stack>
      <Stack spacing={1} sx={{ mt: 1.5 }}>
        {answer.top.map((item, index) => (
          <Stack key={item.employeeId} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <Typography sx={{ minWidth: 24 }} color="text.secondary">
              {index + 1}.
            </Typography>
            <Box sx={{ minWidth: 200 }}>
              <Typography fontWeight={600}>{item.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {item.title} · {item.availabilityLabel}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, minWidth: 120 }}>
              <LinearProgress variant="determinate" value={item.score} color={item.score >= 75 ? 'success' : 'warning'} sx={{ height: 8, borderRadius: 4 }} />
            </Box>
            <Typography fontWeight={700} sx={{ minWidth: 72 }}>
              {item.score}/100
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {item.optionalMet.map((label) => (
                <Chip key={label} size="small" color="success" variant="outlined" label={`✓ ${label}`} />
              ))}
              {item.optionalMissing.map((label) => (
                <Chip key={label} size="small" variant="outlined" label={`✗ ${label}`} />
              ))}
            </Stack>
          </Stack>
        ))}
        {!answer.top.length ? <Alert severity="info">Nobody meets every must-have criterion. Relax a must-have or make it optional.</Alert> : null}
      </Stack>
      {answer.notes.map((note) => (
        <Typography key={note} variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {note}
        </Typography>
      ))}
    </Box>
  );
}

function AnswerPanel({ answer, loading, error, onShowPeople }: { answer: QueryAnswer | undefined; loading: boolean; error: boolean; onShowPeople: () => void }): JSX.Element | null {
  if (error) return <Alert severity="warning">The statistic could not be calculated for these criteria. The matching people are listed below.</Alert>;
  if (loading && !answer) return <LinearProgress />;
  if (!answer) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'primary.main', borderWidth: 1 }} aria-label="Answer">
      {answer.kind === 'STAT' ? <StatView answer={answer} onShowPeople={onShowPeople} /> : null}
      {answer.kind === 'COMPARE' ? <CompareView answer={answer} onShowPeople={onShowPeople} /> : null}
      {answer.kind === 'MATCH' ? <MatchView answer={answer} /> : null}
    </Paper>
  );
}

export default AnswerPanel;
