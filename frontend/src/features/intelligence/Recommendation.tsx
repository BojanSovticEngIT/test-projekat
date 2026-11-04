import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { CandidateMatch, MatchAnswer, MatchingWeights } from '../../types/intelligence.types';

// Scores within this many points are presented as "close second", so the user compares before deciding.
const CLOSE_GAP = 5;

const COMPONENT_LABELS: Record<keyof MatchingWeights, string> = {
  optional: 'optional criteria',
  competency: 'skill level',
  experience: 'relevant project experience',
  availability: 'availability'
};

export interface RecommendationView {
  name: string;
  title: string;
  score: number;
  reasons: string[];
  second: { name: string; score: number; note: string } | null;
}

export interface ExceptionView {
  name: string;
  missing: string[];
}

// The recommendation is derived from the deterministic ranking by fixed rules. No AI chooses or scores anyone.
function RecommendationCard({ recommendation, exception }: { recommendation: RecommendationView | null; exception: ExceptionView | null }): JSX.Element | null {
  if (recommendation) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'success.main', borderWidth: 2 }} aria-label="Recommended candidate">
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <EmojiEventsOutlinedIcon color="success" />
          <Typography variant="subtitle1" fontWeight={700}>
            Recommended: {recommendation.name}
          </Typography>
          <Chip size="small" color="success" label={`Fit score ${recommendation.score}/100`} />
          <Typography variant="body2" color="text.secondary">
            {recommendation.title}
          </Typography>
        </Stack>
        <Box component="ul" sx={{ m: 0, mt: 1, pl: 3 }}>
          {recommendation.reasons.map((reason) => (
            <Typography component="li" variant="body2" key={reason}>
              {reason}
            </Typography>
          ))}
        </Box>
        {recommendation.second ? (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Close second:</strong> {recommendation.second.name} ({recommendation.second.score}/100). {recommendation.second.note}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Highest fit score among people who meet every must-have, chosen by fixed rules from the ranking below (no AI). The decision stays with you.
        </Typography>
      </Paper>
    );
  }
  if (exception) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: 'warning.main', borderStyle: 'dashed' }} aria-label="No recommendation">
        <Stack direction="row" spacing={1} alignItems="center">
          <ReportProblemOutlinedIcon color="warning" />
          <Typography variant="subtitle1" fontWeight={700}>
            No recommendation: nobody meets every must-have
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Closest person, a possible exception only, not a match: <strong>{exception.name}</strong>. Missing: {exception.missing.join('; ')}.
        </Typography>
      </Paper>
    );
  }
  return null;
}

// Demand matching page: full candidate data with score components.
export const recommendFromCandidates = (
  eligible: CandidateMatch[],
  notEligible: CandidateMatch[]
): { recommendation: RecommendationView | null; exception: ExceptionView | null } => {
  const [top, next] = eligible;
  if (!top) {
    const closest = notEligible[0];
    return {
      recommendation: null,
      exception: closest ? { name: closest.name, missing: closest.mustHave.filter((item) => !item.met).map((item) => item.label) } : null
    };
  }
  const optionalMet = top.optional.filter((item) => item.met);
  const reasons = [
    `Meets all ${top.mustHave.length} must-have criteria`,
    ...(top.optional.length
      ? [`${optionalMet.length} of ${top.optional.length} optional criteria${optionalMet.length ? `: ${optionalMet.map((item) => item.label).join(', ')}` : ''}`]
      : []),
    `Availability: ${top.availabilityLabel}`
  ];
  let second: RecommendationView['second'] = null;
  if (next && (top.score ?? 0) - (next.score ?? 0) <= CLOSE_GAP) {
    const keys = Object.keys(COMPONENT_LABELS) as (keyof MatchingWeights)[];
    const better = keys.filter((key) => (next.components[key] ?? -1) > (top.components[key] ?? -1)).map((key) => COMPONENT_LABELS[key]);
    second = {
      name: next.name,
      score: next.score ?? 0,
      note: better.length ? `Stronger on ${better.join(' and ')}; compare both before deciding.` : 'Very close overall; compare both before deciding.'
    };
  }
  return { recommendation: { name: top.name, title: top.title, score: top.score ?? 0, reasons, second }, exception: null };
};

// Search & Discovery match answer: summary data only.
export const recommendFromAnswer = (answer: MatchAnswer): { recommendation: RecommendationView | null; exception: ExceptionView | null } => {
  const [top, next] = answer.top;
  if (!top) return { recommendation: null, exception: null };
  return {
    recommendation: {
      name: top.name,
      title: top.title,
      score: top.score,
      reasons: [
        'Meets every must-have criterion',
        ...(top.optionalMet.length || top.optionalMissing.length
          ? [`${top.optionalMet.length} of ${top.optionalMet.length + top.optionalMissing.length} optional criteria${top.optionalMet.length ? `: ${top.optionalMet.join(', ')}` : ''}`]
          : []),
        `Availability: ${top.availabilityLabel}`
      ],
      second:
        next && top.score - next.score <= CLOSE_GAP
          ? { name: next.name, score: next.score, note: 'Very close; open Demand matching to compare them side by side.' }
          : null
    },
    exception: null
  };
};

export default RecommendationCard;
