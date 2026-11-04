import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { useState } from 'react';
import { WorkforcePageHeader } from '../../../components/WorkforcePageHeader';

// Published list prices per 1M tokens (USD, Azure OpenAI Global Standard pay-as-you-go), as listed by public
// price trackers in November 2026. Verify on the Azure pricing page for the chosen region before quoting.
const MODELS = [
  { name: 'GPT-4o mini', input: 0.15, output: 0.6, note: 'Cheapest proven option for short structured output' },
  { name: 'GPT-4.1 mini', input: 0.4, output: 1.6, note: 'Recommended: reliable JSON output, good multilingual (Serbian) quality' },
  { name: 'GPT-5 mini', input: 0.25, output: 2.0, note: 'Reasoning model: hidden reasoning tokens are billed as output; use minimal reasoning' },
  { name: 'GPT-4.1', input: 2.0, output: 8.0, note: 'Premium; not needed for query interpretation' }
];
const SCENARIOS = [1_000, 10_000, 50_000];

const FLOW = [
  { title: 'User asks', text: 'A question in plain English or Serbian, e.g. "What percentage of our employees are Java developers?"' },
  { title: 'AI interprets', text: 'An Azure-hosted model (Azure OpenAI in Azure AI Foundry) reads only the question and the list of known skills, units and filters.' },
  { title: 'Structured criteria', text: 'The model returns JSON: intent, must-have and optional criteria, filters. No names, no numbers.' },
  { title: 'Backend validates', text: 'The existing Spring Boot backend checks every field against the catalogue and rejects anything unknown.' },
  { title: 'Data is retrieved', text: 'Existing services and the PostgreSQL database (employees, skills, allocations, demands) run the actual query.' },
  { title: 'Rules and permissions', text: 'The backend applies role-based visibility, then calculates counts, percentages, durations and match scores deterministically.' },
  { title: 'Results shown', text: 'The screen shows the answer, the people behind it and exactly what was understood, so users can check and edit it.' }
];

const SERVICES: { name: string; need: 'Necessary' | 'Recommended' | 'Optional' | 'Not needed'; why: string }[] = [
  { name: 'Existing Spring Boot backend + PostgreSQL', need: 'Necessary', why: 'Already holds employees, skills, allocations and demands. All retrieval, permissions and calculations stay here.' },
  { name: 'Azure OpenAI model (via Azure AI Foundry)', need: 'Necessary', why: 'Turns natural language into structured criteria. One small model deployment is enough.' },
  { name: 'Azure Key Vault', need: 'Recommended', why: 'Stores the model key; the backend already reads azure.openai.endpoint/key from configuration.' },
  { name: 'Application Insights / Log Analytics', need: 'Recommended', why: 'Monitors latency, failures and token use; supports the budget limits shown in Usage & costs.' },
  { name: 'Microsoft Entra ID (SSO)', need: 'Optional', why: 'Single sign-on instead of local accounts. Independent of AI search.' },
  { name: 'Azure AI Search (keyword / vector / hybrid)', need: 'Optional', why: 'Only worth it for free-text content such as CVs and project descriptions ("experience like e-commerce"). Structured filters do not need it.' },
  { name: 'Embedding model', need: 'Optional', why: 'Only together with Azure AI Search for semantic matching of text.' },
  { name: 'Separate vector database, Cosmos DB, API Management', need: 'Not needed', why: 'Adds cost and operations without solving a stakeholder requirement at this size.' }
];

const ALTERNATIVES = [
  {
    option: 'Rules first, AI only when needed (smart routing)',
    pros: 'Simple searches ("React on bench") cost nothing and answer instantly. Already shown in this demo.',
    cons: 'Rules cover known phrasings only; the LLM handles the rest.'
  },
  {
    option: 'Smaller, faster model (e.g. GPT-4o mini)',
    pros: 'Lowest per-search price; fast. Query interpretation is a small task.',
    cons: 'Slightly less robust on unusual phrasing; test with Serbian queries.'
  },
  {
    option: 'Cache repeated interpretations',
    pros: 'Same question twice = one model call. Saved searches never need the model again.',
    cons: 'Little effect when every question is different.'
  },
  {
    option: 'Ollama with an open-weight model (proof of concept)',
    pros: 'Runs on a developer laptop; no data leaves the machine; no token fees.',
    cons: 'Not a production server: no scaling, monitoring or high availability.'
  },
  {
    option: 'Self-hosted open-weight model with vLLM (production)',
    pros: 'Full data control; no per-token fee; predictable monthly cost.',
    cons: 'GPU servers cost money even when idle (roughly $400/month for a small T4-class VM running 24/7, $1,500–3,000+ for larger GPUs), plus patching, monitoring and model updates.'
  }
];

const NEED_COLOR: Record<string, 'success' | 'primary' | 'default' | 'error'> = {
  Necessary: 'success',
  Recommended: 'primary',
  Optional: 'default',
  'Not needed': 'error'
};

const usd = (value: number): string =>
  value < 0.01 ? `$${value.toFixed(5)}` : value < 1 ? `$${value.toFixed(3)}` : `$${value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;

function AiArchitecturePage(): JSX.Element {
  const [inputTokens, setInputTokens] = useState(1500);
  const [outputTokens, setOutputTokens] = useState(150);
  const [routedPct, setRoutedPct] = useState(30);
  const perSearch = (model: (typeof MODELS)[number]): number => (inputTokens * model.input + outputTokens * model.output) / 1_000_000;
  const monthly = (model: (typeof MODELS)[number], searches: number): number => perSearch(model) * searches * (1 - routedPct / 100);

  return (
    <Box>
      <WorkforcePageHeader
        title="AI search: how it works and what it costs"
        description="What the demo shows today, how the production version would work in the Microsoft ecosystem, and what drives the running cost."
        breadcrumbs={[{ label: 'Workforce Intelligence', to: '/intelligence' }, { label: 'AI architecture & cost' }]}
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Current demo</Typography>
                <Chip size="small" color="warning" label="Simulated" />
              </Stack>
              {[
                'Query interpretation is simulated by a rule engine that produces the same structured output an LLM would.',
                'Demo data: about 100 fictional employees, 28 projects, 14 demands and 23 applicants.',
                'Filtering and calculations run in the browser (mock API), with the same rules the backend will use.',
                'No external AI service is called. No employee data is sent anywhere.',
                'Token counts and costs are estimates, so the cost model can be discussed.'
              ].map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Production proposal</Typography>
                <Chip size="small" color="primary" label="Microsoft / Azure" />
              </Stack>
              {[
                'Azure OpenAI in Azure AI Foundry interprets the question (EU data zone deployment).',
                'Structured JSON output, validated by the backend against the skill and organisation catalogue.',
                'The existing backend services and database retrieve the data. No data copy for the AI.',
                'Azure AI Search only where free-text or semantic search adds value (CVs, project descriptions).',
                'Permissions, business rules, workforce statistics and demand scoring stay deterministic in the backend.'
              ].map((line) => (
                <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                  • {line}
                </Typography>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          From question to answer
        </Typography>
        <Grid container spacing={1.5}>
          {FLOW.map((step, index) => (
            <Grid item xs={12} sm={6} md={3} lg key={step.title}>
              <Box sx={{ p: 1.5, height: '100%', borderRadius: 1, border: 1, borderColor: index === 1 || index === 2 ? 'secondary.main' : 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Step {index + 1}
                </Typography>
                <Typography fontWeight={700}>{step.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.text}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">What the AI does</Typography>
            {['Understands the question, including Serbian and different phrasings', 'Extracts skills, years, availability, must-have and optional criteria', 'Says what it understood, so the user can correct it'].map((line) => (
              <Stack key={line} direction="row" spacing={1} alignItems="center">
                <CheckCircleOutlineIcon color="success" fontSize="small" />
                <Typography variant="body2">{line}</Typography>
              </Stack>
            ))}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2">What the AI does not do</Typography>
            {[
              'It does not see the employee database',
              'It does not calculate counts, percentages or scores',
              'It does not decide who may see which person'
            ].map((line) => (
              <Stack key={line} direction="row" spacing={1} alignItems="center">
                <HighlightOffIcon color="error" fontSize="small" />
                <Typography variant="body2">{line}</Typography>
              </Stack>
            ))}
          </Grid>
        </Grid>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Which Azure services are needed
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Need</TableCell>
                <TableCell>Why</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SERVICES.map((service) => (
                <TableRow key={service.name}>
                  <TableCell sx={{ fontWeight: 600 }}>{service.name}</TableCell>
                  <TableCell>
                    <Chip size="small" color={NEED_COLOR[service.need]} variant={service.need === 'Optional' ? 'outlined' : 'filled'} label={service.need} />
                  </TableCell>
                  <TableCell>{service.why}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          LLM cost estimate (query interpretation only)
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          List prices per 1M tokens for Azure OpenAI Global Standard, from public price trackers (November 2026). The final price depends on model, region, deployment type (Global, Data Zone EU is about 10% higher) and
          currency. This is only the LLM part, not the whole solution cost.
        </Alert>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Input tokens per search"
              helperText="Instructions + catalogue vocabulary + JSON schema + question"
              value={inputTokens}
              inputProps={{ min: 100, max: 20000, step: 100 }}
              onChange={(event) => setInputTokens(Math.max(0, Number(event.target.value) || 0))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Output tokens per search"
              helperText="The structured JSON answer"
              value={outputTokens}
              inputProps={{ min: 20, max: 4000, step: 10 }}
              onChange={(event) => setOutputTokens(Math.max(0, Number(event.target.value) || 0))}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2">Searches answered without the LLM (rules, cache): {routedPct}%</Typography>
            <Slider size="small" min={0} max={80} step={5} value={routedPct} onChange={(_, value) => setRoutedPct(value as number)} aria-label="Share answered without LLM" />
          </Grid>
        </Grid>
        <TableContainer>
          <Table size="small" aria-label="LLM cost scenarios">
            <TableHead>
              <TableRow>
                <TableCell>Model</TableCell>
                <TableCell align="right">Price in / out per 1M</TableCell>
                <TableCell align="right">Per search</TableCell>
                {SCENARIOS.map((count) => (
                  <TableCell key={count} align="right">
                    {count.toLocaleString('en-US')} / month
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {MODELS.map((model) => (
                <TableRow key={model.name} selected={model.name === 'GPT-4.1 mini'}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {model.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {model.note}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    ${model.input.toFixed(2)} / ${model.output.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">{usd(perSearch(model))}</TableCell>
                  {SCENARIOS.map((count) => (
                    <TableCell key={count} align="right">
                      {usd(monthly(model, count))}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Other costs, separate from the LLM</strong> (indicative list prices; check the Azure pricing calculator for your region):
        </Typography>
        {[
          'Hosting: none extra — the existing backend and database are reused.',
          'Azure AI Search, only if semantic/hybrid search is approved: about $74 per month (Basic, 1 search unit) to about $245 per month (Standard S1, 1 search unit).',
          'Embeddings, only with Azure AI Search: indexing a few thousand CVs and project descriptions costs cents to a few dollars per run with a small embedding model.',
          'Monitoring (Application Insights / Log Analytics): pay per GB of logs, typically a few to a few tens of dollars per month at this volume.',
          'Key Vault: negligible. Engineering, testing and support effort are not included above.'
        ].map((line) => (
          <Typography key={line} variant="body2" color="text.secondary">
            • {line}
          </Typography>
        ))}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Cheaper alternatives
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Option</TableCell>
                <TableCell>Advantages</TableCell>
                <TableCell>Disadvantages</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ALTERNATIVES.map((row) => (
                <TableRow key={row.option}>
                  <TableCell sx={{ fontWeight: 600 }}>{row.option}</TableCell>
                  <TableCell>{row.pros}</TableCell>
                  <TableCell>{row.cons}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Local inference has no per-token fee, but servers, GPUs, monitoring and maintenance cost money every month. At the volumes above, a managed Azure model is usually cheaper than running GPUs.
        </Typography>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Data privacy
            </Typography>
            {[
              'Only the user’s question and the catalogue vocabulary (skill and unit names) are sent to the model — never employee records.',
              'The model runs in the company’s own Azure subscription, in an EU data zone. Azure OpenAI does not use customer prompts to train models.',
              'Permissions are enforced by the backend before any data is read; the AI cannot widen what a user may see.',
              'Questions can be logged without personal data, with a retention period agreed with the client.'
            ].map((line) => (
              <Typography key={line} variant="body2" sx={{ mb: 0.5 }}>
                • {line}
              </Typography>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              In one minute (presentation script)
            </Typography>
            <Typography variant="body2" paragraph>
              “You can ask the system questions the way you would ask a colleague — in English or Serbian. The AI’s only job is to understand the question and turn it into precise search criteria, which you always see
              and can change.”
            </Typography>
            <Typography variant="body2" paragraph>
              “The answer itself comes from your existing system: the same database, the same permissions, the same business rules. The AI never sees the employee data and never calculates the numbers, so results
              are exact and repeatable.”
            </Typography>
            <Typography variant="body2">
              “The running cost of the AI part is small and predictable: at ten thousand questions a month it is in the order of a few dollars to tens of dollars, depending on the model. Simple searches do not use AI
              at all. What you see today is a demo with sample data and simulated AI; the production version connects the same screens to your backend and an Azure-hosted model.”
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AiArchitecturePage;
