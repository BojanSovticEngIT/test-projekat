import { lazy, Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import { UserRole } from '../types/enums';
import { MEETING_PARTICIPANT_ROLES } from '../features/demand/meetingOptions';
import { getModuleRoles, getNavigationRoles } from '@layout/navigation';

const LoginPage = lazy(() => import('@pages/Login'));
const DashboardPage = lazy(() => import('@pages/Dashboard'));
const EmployeesPage = lazy(() => import('@pages/Employees'));
const EmployeeDetailPage = lazy(() => import('@pages/EmployeeDetail'));
const EmployeeFormPage = lazy(() => import('@pages/EmployeeForm'));
const MySkillsPage = lazy(() => import('@pages/MySkills'));
const MySkillAddPage = lazy(() => import('@pages/MySkillAdd'));
const MySkillEditPage = lazy(() => import('@pages/MySkillEdit'));
const MyTeamPage = lazy(() => import('@pages/MyTeam/index'));
const SkillCatalogPage = lazy(() => import('@pages/SkillCatalog'));
const SkillCategoriesPage = lazy(() => import('@pages/SkillCategories'));
const ValidationRequestsPage = lazy(() => import('@pages/ValidationRequests'));
const ValidationRequestDetailPage = lazy(() => import('@pages/ValidationRequestDetail'));
const CertificationsPage = lazy(() => import('@pages/Certifications'));
const CertificationCreatePage = lazy(() => import('@pages/CertificationCreate'));
const CertificationEditPage = lazy(() => import('@pages/CertificationEdit'));
const ImportPage = lazy(() => import('@pages/Import'));
const AuditLogPage = lazy(() => import('@pages/AuditLog'));
const WorkforceProjectsPage = lazy(() => import('@pages/Workforce/Projects'));
const WorkforceProjectDetailPage = lazy(() => import('@pages/Workforce/ProjectDetail'));
const CorporateStructurePage = lazy(() => import('@pages/Administration/CorporateStructure'));
const CorporateStructureFormPage = lazy(() => import('@pages/Administration/CorporateStructure/NodeForm'));
const MarketStructurePage = lazy(() => import('@pages/Administration/MarketStructure'));
const MarketStructureFormPage = lazy(() => import('@pages/Administration/MarketStructure/NodeForm'));
const WorkforceProjectCreatePage = lazy(() => import('@pages/Workforce/ProjectCreate'));
const WorkforceProjectEditPage = lazy(() => import('@pages/Workforce/ProjectEdit'));
const WorkforceClientCreatePage = lazy(() => import('@pages/Workforce/ClientCreate'));
const WorkforceAllocationsPage = lazy(() => import('@pages/Workforce/Allocations'));
const WorkforceAllocationCreatePage = lazy(() => import('@pages/Workforce/AllocationCreate'));
const WorkforceAllocationEditPage = lazy(() => import('@pages/Workforce/AllocationEdit'));
const WorkforceAllocationEmployeePage = lazy(() => import('@pages/Workforce/AllocationEmployee'));
const WorkforceAllocationEndPage = lazy(() => import('@pages/Workforce/AllocationEnd'));
const WorkforceAllocationHistoryPage = lazy(() => import('@pages/Workforce/AllocationHistory'));
const WorkforceAllocationSkillsPage = lazy(() => import('@pages/Workforce/AllocationSkills'));
const DemandsPage = lazy(() => import('@pages/Demands'));
const DemandDetailPage = lazy(() => import('@pages/DemandDetail'));
const DemandFormPage = lazy(() => import('@pages/DemandForm'));
const DemandMeetingsPage = lazy(() => import('@pages/DemandMeetings'));
const WorkforceBenchPage = lazy(() => import('@pages/Workforce/Bench'));
const WorkforceImportPage = lazy(() => import('@pages/Workforce/Import'));
const WorkforceHcViewPage = lazy(() => import('@pages/Workforce/HcView'));
const MyAssignmentsPage = lazy(() => import('@pages/MyAssignments'));
const ModuleDashboardPage = lazy(() => import('@pages/ModuleDashboard'));
const ToBeImplementedPage = lazy(() => import('@pages/ToBeImplemented'));
const SearchDiscoveryPage = lazy(() => import('@pages/SearchDiscovery'));
const IntelligenceDashboardPage = lazy(() => import('@pages/Intelligence/Dashboard'));
const IntelligenceAnalyticsPage = lazy(() => import('@pages/Intelligence/Analytics'));
const DemandMatchingPage = lazy(() => import('@pages/Intelligence/Matching'));
const ExternalApplicantsPage = lazy(() => import('@pages/Intelligence/Applicants'));
const SearchCostsPage = lazy(() => import('@pages/Intelligence/Costs'));
const AiArchitecturePage = lazy(() => import('@pages/Intelligence/AiArchitecture'));

const placeholderRoutes = [
  { path: '/demand-management/pipeline', title: 'Pipeline' },
  { path: '/administration/corporate-structure', title: 'Corporate structure' },
  { path: '/administration/market-structure', title: 'Market Structure' },
  { path: '/administration/organisation-structure', title: 'Organisation structure' },
  { path: '/administration/application-access-roles', title: 'Application access roles' }
];

const suspenseFallback = (
  <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <CircularProgress />
  </Box>
);

function AppRouter(): JSX.Element {
  return (
    <Suspense fallback={suspenseFallback}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/employees/new" element={<EmployeeFormPage />} />
              <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            </Route>
            <Route path="/my-skills" element={<MySkillsPage />} />
            <Route path="/my-skills/new" element={<MySkillAddPage />} />
            <Route path="/my-skills/:id/edit" element={<MySkillEditPage />} />
            <Route path="/my-assignments" element={<MyAssignmentsPage />} />
            <Route path="/certifications" element={<CertificationsPage />} />
            <Route path="/certifications/new" element={<CertificationCreatePage />} />
            <Route path="/certifications/:id/edit" element={<CertificationEditPage />} />
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.LINE_MANAGER]} />}>
              <Route path="/my-team" element={<MyTeamPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.HR]} />}>
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/skills" element={<SkillCatalogPage />} />
              <Route path="/skill-categories" element={<SkillCategoriesPage />} />
              <Route path="/import" element={<ImportPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.LINE_MANAGER]} />}>
              <Route path="/validation-requests" element={<ValidationRequestsPage />} />
              <Route path="/validation-requests/:id" element={<ValidationRequestDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PMO]} />}>
              <Route path="/workforce/clients/new" element={<WorkforceClientCreatePage />} />
              <Route path="/workforce/projects/new" element={<WorkforceProjectCreatePage />} />
              <Route path="/workforce/projects/:id/edit" element={<WorkforceProjectEditPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.ADMIN, UserRole.PMO, UserRole.HR, UserRole.HR_BUSINESS_PARTNER]}
                />
              }
            >
              <Route path="/workforce/projects" element={<WorkforceProjectsPage />} />
              <Route path="/workforce/projects/:id" element={<WorkforceProjectDetailPage />} />
              <Route path="/workforce/hc-view" element={<WorkforceHcViewPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.ADMIN, UserRole.PMO, UserRole.LINE_MANAGER, UserRole.HR_BUSINESS_PARTNER]}
                />
              }
            >
              <Route path="/workforce/allocations/new" element={<WorkforceAllocationCreatePage />} />
              <Route path="/workforce/allocations/:id/edit" element={<WorkforceAllocationEditPage />} />
              <Route path="/workforce/allocations/:id/end" element={<WorkforceAllocationEndPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    UserRole.ADMIN,
                    UserRole.PMO,
                    UserRole.LINE_MANAGER,
                    UserRole.HR,
                    UserRole.HR_BUSINESS_PARTNER
                  ]}
                />
              }
            >
              <Route path="/workforce/allocations" element={<WorkforceAllocationsPage />} />
              <Route path="/workforce/allocations/employee/:employeeId" element={<WorkforceAllocationEmployeePage />} />
              <Route path="/workforce/allocations/:id/history" element={<WorkforceAllocationHistoryPage />} />
              <Route path="/workforce/allocations/:id/skills" element={<WorkforceAllocationSkillsPage />} />
              <Route path="/workforce/bench" element={<WorkforceBenchPage />} />
              <Route
                path="/workforce/availability"
                element={<Navigate to="/workforce/bench" replace />}
              />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PMO]} />}>
              <Route path="/workforce/import" element={<WorkforceImportPage />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    UserRole.ADMIN,
                    UserRole.PMO,
                    UserRole.LINE_MANAGER,
                    UserRole.HR_BUSINESS_PARTNER
                  ]}
                />
              }
            >
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER, UserRole.MANAGEMENT]}
                />
              }
            >
              <Route path="/demands" element={<DemandsPage />} />
              <Route path="/demands/:id" element={<DemandDetailPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PMO]} />}>
              <Route path="/demands/new" element={<DemandFormPage />} />
              <Route path="/demands/:id/edit" element={<DemandFormPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={MEETING_PARTICIPANT_ROLES} />}>
              <Route path="/my-meetings" element={<DemandMeetingsPage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={getModuleRoles('workforce')} />}>
              <Route path="/workforce" element={<ModuleDashboardPage moduleId="workforce" />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={getModuleRoles('demand-management')} />}>
              <Route path="/demand-management" element={<ModuleDashboardPage moduleId="demand-management" />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={getModuleRoles('intelligence')} />}>
              <Route path="/intelligence" element={<ModuleDashboardPage moduleId="intelligence" />} />
            </Route>
            {[
              { path: '/search', element: <SearchDiscoveryPage /> },
              { path: '/intelligence/dashboard', element: <IntelligenceDashboardPage /> },
              { path: '/intelligence/analytics', element: <IntelligenceAnalyticsPage /> },
              { path: '/intelligence/matching', element: <DemandMatchingPage /> },
              { path: '/intelligence/applicants', element: <ExternalApplicantsPage /> },
              { path: '/intelligence/costs', element: <SearchCostsPage /> },
              { path: '/intelligence/ai-architecture', element: <AiArchitecturePage /> }
            ].map(({ path, element }) => (
              <Route key={path} element={<ProtectedRoute allowedRoles={getNavigationRoles(path)} />}>
                <Route path={path} element={element} />
              </Route>
            ))}
            <Route element={<ProtectedRoute allowedRoles={getModuleRoles('administration')} />}>
              <Route path="/administration" element={<ModuleDashboardPage moduleId="administration" />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[UserRole.ADMIN, UserRole.PMO, UserRole.HR, UserRole.HR_BUSINESS_PARTNER]}
                />
              }
            >
              <Route path="/administration/corporate-structure" element={<CorporateStructurePage />} />
              <Route path="/administration/market-structure" element={<MarketStructurePage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.PMO]} />}>
              <Route path="/administration/corporate-structure/new" element={<CorporateStructureFormPage />} />
              <Route path="/administration/corporate-structure/:id/edit" element={<CorporateStructureFormPage />} />
              <Route path="/administration/market-structure/new" element={<MarketStructureFormPage />} />
              <Route path="/administration/market-structure/:id/edit" element={<MarketStructureFormPage />} />
            </Route>
            {placeholderRoutes.map(({ path, title }) => (
              <Route key={path} element={<ProtectedRoute allowedRoles={getNavigationRoles(path)} />}>
                <Route path={path} element={<ToBeImplementedPage title={title} />} />
              </Route>
            ))}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default AppRouter;
