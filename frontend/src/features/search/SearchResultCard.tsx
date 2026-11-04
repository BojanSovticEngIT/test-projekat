import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import WorkHistoryOutlinedIcon from '@mui/icons-material/WorkHistoryOutlined';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  LinearProgress,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useState } from 'react';
import { LEVEL_LABEL } from '../../components/SkillLevelBadge/SkillLevelBadge';
import type { PersonKind, SearchResult, SearchWeights, SkillEvidence, SkillMatch } from '../../types/search.types';
import { SENIORITY_LABELS } from './searchFilters';

const KIND_LABEL: Record<PersonKind, string> = {
  EMPLOYEE: 'Employee',
  B2B: 'B2B contractor',
  SUPPLIER: 'Supplier',
  EXTERNAL: 'External applicant'
};

const EVIDENCE_LABEL: Record<SkillEvidence, string> = {
  VALIDATED: 'Approved by manager',
  NOT_VERIFIED: 'Not yet verified',
  APPLICANT_CLAIM: 'Declared by applicant (not verified)'
};

const STATUS_COLOR: Record<SkillMatch['status'], ChipProps['color']> = {
  MET: 'success',
  BELOW_LEVEL: 'warning',
  MISSING: 'default'
};

const scoreColor = (score: number): 'success' | 'warning' | 'error' => (score >= 75 ? 'success' : score >= 50 ? 'warning' : 'error');

const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

function SkillMatchChip({ match }: { match: SkillMatch }): JSX.Element {
  const verified = match.evidence === 'VALIDATED' || match.certified;
  const label =
    match.status === 'MISSING'
      ? `${match.name} · missing`
      : `${match.name} · ${match.level}/5${match.status === 'BELOW_LEVEL' ? ` (needs ${match.requiredLevel})` : ''}`;
  const tooltip = [
    `${match.mustHave ? 'Must-have' : 'Nice to have'}, minimum ${match.requiredLevel} — ${LEVEL_LABEL[match.requiredLevel]}`,
    match.level !== null ? `Has ${match.level} — ${LEVEL_LABEL[match.level]}` : 'Not in profile',
    match.evidence ? EVIDENCE_LABEL[match.evidence] : null,
    match.certified ? 'Backed by a valid certificate' : null,
    match.usedOnProject ? 'Used on a project' : null
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Tooltip title={tooltip}>
      <Chip
        size="small"
        color={STATUS_COLOR[match.status]}
        variant={match.status === 'MISSING' ? 'outlined' : verified ? 'filled' : 'outlined'}
        icon={match.status === 'MISSING' ? undefined : verified ? <VerifiedOutlinedIcon /> : <HelpOutlineIcon />}
        label={label}
      />
    </Tooltip>
  );
}

function BreakdownRow({ label, value, weight }: { label: string; value: number | null; weight: number }): JSX.Element | null {
  if (value === null || weight === 0) return null;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2">
          {label} <Typography component="span" variant="caption" color="text.secondary">({weight}% of score)</Typography>
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" value={value} color={scoreColor(value)} sx={{ height: 6, borderRadius: 3 }} />
    </Box>
  );
}

interface Props {
  result: SearchResult;
  weights: SearchWeights;
}

function SearchResultCard({ result, weights }: Props): JSX.Element {
  const [open, setOpen] = useState(false);
  const missing = result.skillMatches.filter((match) => match.mustHave && match.status !== 'MET').map((match) => match.name);
  const facts = [
    result.location,
    result.unit,
    result.lineManager ? `Line manager: ${result.lineManager}` : null,
    result.recruiter ? `Recruiter: ${result.recruiter}` : null,
    result.expectedDailyRate ? `Expected rate: €${result.expectedDailyRate}/day` : null,
    result.seniority ? `Seniority: ${SENIORITY_LABELS[result.seniority]}` : null,
    result.costCode ? `Cost code: ${result.costCode}` : null
  ].filter(Boolean);

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
          <Avatar sx={{ bgcolor: result.kind === 'EXTERNAL' ? 'secondary.main' : 'primary.main' }}>{initials(result.name)}</Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" component="h3">
                {result.name}
              </Typography>
              <Chip size="small" label={KIND_LABEL[result.kind]} color={result.kind === 'EXTERNAL' ? 'secondary' : 'default'} />
              {result.matchType === 'FULL' ? (
                <Chip size="small" color="success" icon={<CheckCircleOutlineIcon />} label="All must-haves met" />
              ) : null}
              {result.matchType === 'PARTIAL' ? (
                <Chip size="small" color="warning" label={`Partial match · missing: ${missing.join(', ')}`} />
              ) : null}
            </Stack>
            <Typography color="text.secondary">{result.title}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {facts.join(' · ')}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {result.skillMatches.map((match) => (
                <SkillMatchChip key={match.skillId} match={match} />
              ))}
              {result.otherSkills.map((skill) => (
                <Tooltip key={skill.name} title={EVIDENCE_LABEL[skill.evidence]}>
                  <Chip size="small" variant="outlined" label={`${skill.name} · ${skill.level}/5`} sx={{ opacity: 0.75 }} />
                </Tooltip>
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mt: 1.5 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <EventAvailableOutlinedIcon fontSize="small" color="action" />
                <Typography variant="body2">{result.availability.label}</Typography>
              </Stack>
              {result.relevantProjects[0] ? (
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <WorkHistoryOutlinedIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    {result.relevantProjects[0].name}
                    {result.relevantProjects[0].client ? ` (${result.relevantProjects[0].client})` : ''} · {result.relevantProjects[0].role}
                    {result.relevantProjects[0].current ? ' · current' : ''}
                  </Typography>
                </Stack>
              ) : null}
            </Stack>
          </Box>

          <Stack alignItems="center" spacing={1} sx={{ minWidth: 120 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress variant="determinate" value={result.score} size={64} color={scoreColor(result.score)} />
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography fontWeight={700} aria-label={`Match score ${result.score} out of 100`}>
                  {result.score}
                </Typography>
              </Box>
            </Box>
            <Button size="small" onClick={() => setOpen((value) => !value)} endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
              Why this rank?
            </Button>
          </Stack>
        </Stack>

        <Collapse in={open} unmountOnExit>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              <BreakdownRow label="Skills & level" value={result.breakdown.skills} weight={weights.skills} />
              <BreakdownRow label="Availability" value={result.breakdown.availability} weight={weights.availability} />
              <BreakdownRow label="Project experience" value={result.breakdown.experience} weight={weights.experience} />
              <BreakdownRow label="Recent use" value={result.breakdown.recency} weight={weights.recency} />
            </Stack>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Explanation
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {result.reasons.map((reason) => (
                  <Typography component="li" variant="body2" key={reason}>
                    {reason}
                  </Typography>
                ))}
              </Box>
              {result.relevantProjects.length > 0 ? (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1.5 }} gutterBottom>
                    Projects
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {result.relevantProjects.map((project) => (
                      <Typography component="li" variant="body2" key={`${project.name}-${project.period}`}>
                        {project.name}
                        {project.client ? `, ${project.client}` : ''}
                        {project.vertical ? ` (${project.vertical})` : ''} — {project.role}, {project.period}
                      </Typography>
                    ))}
                  </Box>
                </>
              ) : null}
            </Box>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
}

export default SearchResultCard;
