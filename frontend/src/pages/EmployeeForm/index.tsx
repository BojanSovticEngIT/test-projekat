import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Box, Button, Card, CardContent, CircularProgress, Grid, MenuItem, Stack, TextField } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkforcePageHeader } from '../../components';
import {
  useCountries,
  useCreateEmployee,
  useEmployee,
  useEmployees,
  useUpdateEmployee
} from '@features/employee/employeeApi';
import {
  COST_CODE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  WORKFORCE_TYPE_OPTIONS,
  formatEmploymentStatus,
  formatSeniority
} from '@features/employee/employeeFormat';
import { WorkforceType } from '../../types/enums';
import type { EmploymentStatus } from '../../types/enums';
import type { Employee, EmployeeRequest } from '../../types/employee.types';

const createEmptyForm = (): EmployeeRequest => ({
  firstName: '',
  lastName: '',
  email: '',
  jobTitle: '',
  jobProfile: '',
  location: '',
  managerId: '',
  employmentStatus: 'ACTIVE' as EmploymentStatus,
  workforceType: WorkforceType.EMPLOYEE,
  costCode: ''
});

const mapEmployeeToForm = (employee: Employee): EmployeeRequest => ({
  employeeNumber: employee.employeeNumber,
  firstName: employee.firstName,
  lastName: employee.lastName,
  email: employee.email,
  jobTitle: employee.jobTitle ?? '',
  jobProfile: employee.jobProfile ?? '',
  location: employee.location ?? '',
  managerId: employee.managerId ?? '',
  employmentStatus: employee.employmentStatus,
  workforceType: employee.workforceType ?? WorkforceType.EMPLOYEE,
  costCode: employee.costCode ?? ''
});

const EmployeeFormPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const isCreateMode = !id;

  const { data: employee, isLoading, error } = useEmployee(id);
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  const [formValues, setFormValues] = useState<EmployeeRequest>(createEmptyForm);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EmployeeRequest, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [managerSearch, setManagerSearch] = useState('');
  const [pickedManager, setPickedManager] = useState<Employee | null>(null);

  const { data: countries = [] } = useCountries();
  // A saved country that is not in the list stays selectable so the employee can still be saved unchanged.
  const hasOldCountry = countries.length > 0 && Boolean(formValues.location) && !countries.includes(formValues.location);
  const countryOptions = hasOldCountry ? [formValues.location, ...countries] : countries;

  const managerId = formValues.managerId ?? '';
  const { data: currentManager } = useEmployee(managerId);
  const { data: managerCandidates } = useEmployees({
    search: managerSearch.trim() || undefined,
    employmentStatus: 'ACTIVE' as EmploymentStatus,
    size: 20
  });
  const selectedManager = managerId ? (pickedManager?.id === managerId ? pickedManager : currentManager ?? null) : null;
  const managerOptions = useMemo(() => {
    const options = (managerCandidates?.content ?? []).filter((candidate) => candidate.id !== id);
    return selectedManager && !options.some((candidate) => candidate.id === selectedManager.id)
      ? [selectedManager, ...options]
      : options;
  }, [managerCandidates, selectedManager, id]);

  useEffect(() => {
    if (employee) {
      setFormValues(mapEmployeeToForm(employee));
    }
  }, [employee]);

  const handleChange = (field: keyof EmployeeRequest, value: string) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof EmployeeRequest, string>> = {};

    (['employeeNumber', 'firstName', 'lastName', 'email', 'location'] as const).forEach((field) => {
      if (field === 'employeeNumber' && isCreateMode) {
        return;
      }

      if (!formValues[field]?.trim()) {
        nextErrors[field] = 'Required';
      }
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const payload: EmployeeRequest = {
      ...formValues,
      managerId: formValues.managerId?.trim() || undefined,
      jobTitle: formValues.jobTitle?.trim() || undefined,
      jobProfile: formValues.jobProfile?.trim() || undefined,
      location: formValues.location.trim(),
      costCode: formValues.costCode || null
    };

    try {
      setSaveError(null);

      if (isCreateMode) {
        const created = await createEmployee.mutateAsync(payload);
        navigate(`/employees/${created.id}`, { replace: true });
        return;
      }

      await updateEmployee.mutateAsync({ id, payload });
      navigate(`/employees/${id}`, { replace: true });
    } catch (mutationError) {
      setSaveError(mutationError instanceof Error ? mutationError.message : 'Unable to save employee.');
    }
  };

  const isSaving = createEmployee.isPending || updateEmployee.isPending;
  const cancelPath = isCreateMode ? '/employees' : `/employees/${id}`;
  const title = isCreateMode ? 'New Employee' : 'Edit Employee';

  if (!isCreateMode && isLoading) {
    return (
      <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isCreateMode && error) {
    return <Alert severity="error">{error instanceof Error ? error.message : 'Unable to load employee.'}</Alert>;
  }

  return (
    <Box>
      <WorkforcePageHeader
        title={title}
        description={isCreateMode ? 'Create a new employee record.' : 'Update the employee record.'}
        breadcrumbs={[
          { label: 'Employees', to: '/employees' },
          ...(isCreateMode || !employee
            ? []
            : [{ label: `${employee.firstName} ${employee.lastName}`, to: `/employees/${id}` }]),
          { label: title }
        ]}
      />

      {saveError ? (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 900 }}>
          {saveError}
        </Alert>
      ) : null}

      <Card sx={{ maxWidth: 900 }}>
        <CardContent>
          <Grid container spacing={2}>
            {isCreateMode ? null : (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Employee Number"
                  required
                  value={formValues.employeeNumber ?? ''}
                  onChange={(event) => handleChange('employeeNumber', event.target.value)}
                  error={Boolean(fieldErrors.employeeNumber)}
                  helperText={fieldErrors.employeeNumber}
                />
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                required
                value={formValues.firstName}
                onChange={(event) => handleChange('firstName', event.target.value)}
                error={Boolean(fieldErrors.firstName)}
                helperText={fieldErrors.firstName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                required
                value={formValues.lastName}
                onChange={(event) => handleChange('lastName', event.target.value)}
                error={Boolean(fieldErrors.lastName)}
                helperText={fieldErrors.lastName}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                required
                value={formValues.email}
                onChange={(event) => handleChange('email', event.target.value)}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={countryOptions}
                value={formValues.location || null}
                onChange={(_, value) => handleChange('location', value ?? '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Country"
                    required
                    error={Boolean(fieldErrors.location) || hasOldCountry}
                    helperText={
                      fieldErrors.location ??
                      (hasOldCountry ? 'This country is not in the list. Select a country from the list.' : undefined)
                    }
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Job Title" value={formValues.jobTitle} onChange={(event) => handleChange('jobTitle', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Job Profile" value={formValues.jobProfile} onChange={(event) => handleChange('jobProfile', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={isCreateMode ? 12 : 6}>
              <Autocomplete
                options={managerOptions}
                value={selectedManager}
                onChange={(_, value) => {
                  setPickedManager(value);
                  handleChange('managerId', value?.id ?? '');
                }}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input') setManagerSearch(value);
                }}
                getOptionLabel={(candidate) => `${candidate.firstName} ${candidate.lastName}`}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                filterOptions={(options) => options}
                renderInput={(params) => <TextField {...params} label="Line Manager" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Employment Status"
                value={formValues.employmentStatus}
                onChange={(event) => handleChange('employmentStatus', event.target.value as EmploymentStatus)}
              >
                {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {formatEmploymentStatus(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Workforce Type"
                value={formValues.workforceType ?? WorkforceType.EMPLOYEE}
                onChange={(event) => handleChange('workforceType', event.target.value)}
              >
                {WORKFORCE_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Cost Code"
                value={formValues.costCode ?? ''}
                onChange={(event) => handleChange('costCode', event.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {COST_CODE_OPTIONS.map((code) => (
                  <MenuItem key={code} value={code}>
                    {code}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Seniority"
                value={formatSeniority(formValues.costCode)}
                helperText="Derived from the cost code"
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button onClick={() => navigate(cancelPath)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="contained" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeFormPage;
