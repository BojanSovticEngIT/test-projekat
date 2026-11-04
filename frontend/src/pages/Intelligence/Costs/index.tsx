import { Alert, Box, Button, FormControlLabel, Grid, LinearProgress, Paper, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';
import { BarChart, ChartCard, ColumnChart, KpiCard } from '../../../components/Charts/Charts';
import ExportMenu from '../../../components/ExportMenu/ExportMenu';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useIntelligenceCatalog, useResetUsage, useUpdatePricing, useUsage } from '@features/intelligence/intelligenceApi';
import useAuthStore from '@store/authStore';
import type { Report } from '../../../lib/export';
import type { PricingConfig } from '../../../types/intelligence.types';

const usd = (value: number, digits = 4): string => `$${value.toFixed(digits)}`;

function SearchCostsPage(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const scope = useIntelligenceCatalog().data?.scope;
  const usage = useUsage(null);
  const updatePricing = useUpdatePricing();
  const reset = useResetUsage();
  const [draft, setDraft] = useState<PricingConfig | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const data = usage.data;
  useEffect(() => {
    if (data && !draft) setDraft(data.pricing);
  }, [data, draft]);

  if (usage.isError) return <Alert severity="error">Usage and cost data is not available for your role.</Alert>;

  const perThousandAi = data ? data.totals.avgCostPerAiQuery * 1000 : 0;
  const perThousandConventional = data ? data.totals.avgCostPerConventionalQuery * 1000 : 0;

  const report = (): Report => {
    if (!data) throw new Error('No data yet.');
    return {
      title: 'Search usage and cost (illustrative)',
      subtitle: `Month ${data.month} · model "${data.pricing.modelName}"`,
      generatedAt: new Date(),
      generatedBy: user?.username,
      criteria: [
        `AI price: ${usd(data.pricing.inputUsdPerMillion, 2)} per 1M input tokens, ${usd(data.pricing.outputUsdPerMillion, 2)} per 1M output tokens`,
        `Conventional search: ${usd(data.pricing.conventionalUsdPerThousand, 4)} per 1,000 queries`,
        `Monthly AI budget: ${usd(data.pricing.monthlyBudgetUsd, 2)}`
      ],
      notes: ['Simulated usage from this demo. Prices are illustrative and are not an invoice.'],
      kpis: [
        { label: 'Requests', value: String(data.totals.requests) },
        { label: 'AI requests (LLM)', value: String(data.totals.aiRequests) },
        { label: 'Estimated total', value: usd(data.totals.costUsd) },
        { label: 'Budget used', value: `${data.budgetUsedPct}%` }
      ],
      charts: [
        { title: 'Requests by type', data: data.rows.map((row) => ({ label: row.label, value: row.requests })) },
        { title: 'Estimated cost per 1,000 queries (USD)', data: [{ label: 'Conventional search', value: perThousandConventional }, { label: 'AI search', value: perThousandAi }] }
      ],
      tables: [
        {
          title: 'Usage by type',
          columns: ['Type', 'Requests', 'Input tokens', 'Output tokens', 'Estimated cost (USD)'],
          rows: data.rows.map((row) => [row.label, row.requests, row.inputTokens, row.outputTokens, Number(row.costUsd.toFixed(6))])
        }
      ],
      fileName: 'search-usage-cost'
    };
  };

  return (
    <Box>
      <WorkforcePageHeader
        title="Search usage & costs"
        description="Platform operating cost of conventional search compared with AI search. Figures are estimates from simulated usage and illustrative prices."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'Usage & costs' }]}
        actions={<ExportMenu getReport={report} disabled={!data} />}
      />
      <Alert severity="warning" sx={{ mb: 2 }}>
        Illustrative only: no AI service is connected in this demo. Token counts are estimated (about 4 characters per token) and prices are configurable examples, not an invoice or a quote.
      </Alert>
      {data ? (
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <KpiCard label="Search requests this month" value={data.totals.requests} caption={`${data.totals.conventionalRequests} conventional · ${data.totals.aiRequests} AI`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label="Estimated AI tokens" value={(data.totals.inputTokens + data.totals.outputTokens).toLocaleString('en-GB')} caption={`${data.totals.inputTokens.toLocaleString('en-GB')} in · ${data.totals.outputTokens.toLocaleString('en-GB')} out`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label="Estimated cost this month" value={usd(data.totals.costUsd)} caption={`AI ${usd(data.totals.aiCostUsd)} · conventional ${usd(data.totals.conventionalCostUsd)}`} />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard label="Cost per query" value={usd(data.totals.avgCostPerAiQuery, 6)} caption={`AI query vs ${usd(data.totals.avgCostPerConventionalQuery, 6)} conventional`} />
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Monthly AI budget" subtitle={`${usd(data.totals.aiCostUsd)} of ${usd(data.pricing.monthlyBudgetUsd, 2)}`}>
              <LinearProgress variant="determinate" value={Math.min(100, data.budgetUsedPct)} color={data.budgetUsedPct >= 80 ? 'error' : 'primary'} sx={{ height: 10, borderRadius: 5 }} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {data.budgetUsedPct}% used. When the budget is used up, AI Quick Search falls back to keyword rules at no AI cost. Your AI requests today: {data.myAiRequestsToday} of {data.pricing.dailyAiLimitPerUser}.
              </Typography>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Cost per 1,000 queries (USD)" subtitle="Conventional vs AI, at the configured prices">
              <BarChart data={[{ key: 'conv', label: 'Conventional search', value: perThousandConventional }, { key: 'ai', label: 'AI search (LLM call)', value: perThousandAi }]} valueFormat={(value) => usd(value, 3)} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Requests by type (this month)">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Requests</TableCell>
                    <TableCell align="right">Tokens</TableCell>
                    <TableCell align="right">Est. cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.kind}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell align="right">{row.requests}</TableCell>
                      <TableCell align="right">{(row.inputTokens + row.outputTokens).toLocaleString('en-GB')}</TableCell>
                      <TableCell align="right">{usd(row.costUsd, 6)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <ChartCard title="Requests per day (last 14 days)">
              <ColumnChart data={data.daily} />
            </ChartCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Pricing and limits {scope?.canEditPricing ? '' : '(read-only)'}
              </Typography>
              {draft ? (
                <Stack spacing={1.5}>
                  <TextField size="small" label="Model (illustrative)" value={draft.modelName} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, modelName: event.target.value })} />
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" type="number" label="USD per 1M input tokens" value={draft.inputUsdPerMillion} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, inputUsdPerMillion: Number(event.target.value) })} />
                    <TextField size="small" type="number" label="USD per 1M output tokens" value={draft.outputUsdPerMillion} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, outputUsdPerMillion: Number(event.target.value) })} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" type="number" label="Prompt + schema tokens per AI call" value={draft.systemPromptTokens} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, systemPromptTokens: Number(event.target.value) })} />
                    <TextField size="small" type="number" label="Conventional USD per 1,000 queries" value={draft.conventionalUsdPerThousand} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, conventionalUsdPerThousand: Number(event.target.value) })} />
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" type="number" label="Monthly AI budget (USD)" value={draft.monthlyBudgetUsd} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, monthlyBudgetUsd: Number(event.target.value) })} />
                    <TextField size="small" type="number" label="AI requests per user per day" value={draft.dailyAiLimitPerUser} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, dailyAiLimitPerUser: Number(event.target.value) })} />
                  </Stack>
                  <FormControlLabel control={<Switch checked={draft.aiEnabled} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, aiEnabled: event.target.checked })} />} label="AI search enabled" />
                  <FormControlLabel
                    control={<Switch checked={draft.smartRouting} disabled={!scope?.canEditPricing} onChange={(event) => setDraft({ ...draft, smartRouting: event.target.checked })} />}
                    label="Smart routing: skip the AI call when the query only uses known terms"
                  />
                  {scope?.canEditPricing ? (
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" disabled={updatePricing.isPending} onClick={() => updatePricing.mutate(draft, { onSuccess: setDraft })}>
                        Save settings
                      </Button>
                      <Button color="error" onClick={() => setConfirmReset(true)}>
                        Reset demo usage
                      </Button>
                    </Stack>
                  ) : null}
                </Stack>
              ) : null}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                What costs money and what does not
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Negligible incremental cost</Typography>
                  <Typography variant="body2">
                    Structured search, Quick search, saved-search re-runs, analytics, dashboards, demand matching and exports run as database queries on existing infrastructure. Their cost is part of normal hosting and grows very little per query.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">Costs per use</Typography>
                  <Typography variant="body2">
                    Only the AI interpretation of a natural-language query calls a language model. Its cost = input tokens (instructions + skill/unit catalog + the query) × input price + output tokens (the criteria) × output price. The selected model and the catalog size drive the cost most.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2">How cost is controlled</Typography>
                  <Typography variant="body2">
                    Smart routing skips the AI call for simple queries; saved AI searches re-run their stored criteria without AI; per-user daily limits and a monthly budget switch to keyword fallback; no employee data is sent to the model, only the query and the catalog.
                  </Typography>
                </Grid>
              </Grid>
              <Alert severity="info" sx={{ mt: 2 }}>
                Open business question: "cost" may also mean workforce cost (daily rates of the people found, cost of filling a demand). That is not shown here: internal rates are not in the system today, and cost codes are restricted to HR and Admin. See the specification, open questions.
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <LinearProgress />
      )}
      <ConfirmDialog
        open={confirmReset}
        title="Reset demo usage"
        message="Delete all recorded demo usage for this browser? Pricing settings are kept."
        confirmLabel="Reset"
        loading={reset.isPending}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => reset.mutate(undefined, { onSettled: () => setConfirmReset(false) })}
      />
    </Box>
  );
}

export default SearchCostsPage;
