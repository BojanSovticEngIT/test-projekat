import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import EventSeatOutlinedIcon from '@mui/icons-material/EventSeatOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import TimelineOutlinedIcon from '@mui/icons-material/TimelineOutlined';
import TravelExploreOutlinedIcon from '@mui/icons-material/TravelExploreOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import type { ReactElement } from 'react';
import { MEETING_PARTICIPANT_ROLES } from '../features/demand/meetingOptions';
import { UserRole } from '../types/enums';

export type NavigationModuleId = 'skill-matrix' | 'workforce' | 'demand-management' | 'intelligence' | 'administration';

export interface NavigationItem {
  label: string;
  path: string;
  description: string;
  icon: ReactElement;
  roles: UserRole[];
  // false: reachable from the module dashboard only, not listed in the sidebar submenu
  inSidebar?: boolean;
  // additional route prefixes that mark this item as active
  activePaths?: string[];
}

export interface NavigationModule {
  id: NavigationModuleId;
  label: string;
  path: string;
  icon: ReactElement;
  description: string;
  items: NavigationItem[];
}

const ALL_ROLES = Object.values(UserRole);
const ADMIN_LM = [UserRole.ADMIN, UserRole.LINE_MANAGER];
const ADMIN_HR = [UserRole.ADMIN, UserRole.HR];
const DEMAND_ROLES = [UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER, UserRole.MANAGEMENT];
const WORKFORCE_ROLES = [
  UserRole.ADMIN,
  UserRole.PMO,
  UserRole.LINE_MANAGER,
  UserRole.HR,
  UserRole.HR_BUSINESS_PARTNER
];
export const SEARCH_ROLES = WORKFORCE_ROLES;
const INSIGHT_ROLES = [...WORKFORCE_ROLES, UserRole.MANAGEMENT];
const MATCHING_ROLES = [UserRole.ADMIN, UserRole.PMO, UserRole.HR_BUSINESS_PARTNER];
const COST_ROLES = [UserRole.ADMIN, UserRole.PMO, UserRole.MANAGEMENT];

export const navigationModules: NavigationModule[] = [
  {
    id: 'skill-matrix',
    label: 'Skill Matrix',
    path: '/dashboard',
    icon: <PsychologyOutlinedIcon />,
    description: 'Skills, team validation and certifications.',
    items: [
      {
        label: 'My skills',
        path: '/my-skills',
        description: 'View and manage your self-assessed competencies',
        icon: <TuneOutlinedIcon />,
        roles: ALL_ROLES
      },
      {
        label: 'My Team',
        path: '/my-team',
        description: 'Skills and coverage of your direct reports',
        icon: <GroupsOutlinedIcon />,
        roles: ADMIN_LM
      },
      {
        label: 'Validation requests',
        path: '/validation-requests',
        description: 'Review submitted skill validations',
        icon: <FactCheckOutlinedIcon />,
        roles: ADMIN_LM
      },
      {
        label: 'Certifications',
        path: '/certifications',
        description: 'Track employee certifications and expirations',
        icon: <MilitaryTechOutlinedIcon />,
        roles: ALL_ROLES
      }
    ]
  },
  {
    id: 'workforce',
    label: 'Workforce',
    path: '/workforce',
    icon: <WorkOutlineOutlinedIcon />,
    description: 'Projects, allocations, bench and headcount.',
    items: [
      {
        label: 'Projects/Services',
        path: '/workforce/projects',
        description: 'Browse projects and services',
        icon: <FolderOutlinedIcon />,
        roles: [UserRole.ADMIN, UserRole.PMO, UserRole.HR, UserRole.HR_BUSINESS_PARTNER]
      },
      {
        label: 'Allocations',
        path: '/workforce/allocations',
        description: 'Employee allocations to projects',
        icon: <AssignmentIndOutlinedIcon />,
        roles: WORKFORCE_ROLES
      },
      {
        label: 'Bench/Availability',
        path: '/workforce/bench',
        description: 'Employees currently on bench',
        icon: <EventSeatOutlinedIcon />,
        roles: WORKFORCE_ROLES,
        activePaths: ['/workforce/availability']
      },
      {
        label: 'HC view',
        path: '/workforce/hc-view',
        description: 'Head count overview',
        icon: <PeopleAltOutlinedIcon />,
        roles: [UserRole.ADMIN, UserRole.PMO, UserRole.HR, UserRole.HR_BUSINESS_PARTNER]
      },
      {
        label: 'My Assignments',
        path: '/my-assignments',
        description: 'Your current and past project assignments',
        icon: <AssignmentOutlinedIcon />,
        roles: [UserRole.EMPLOYEE],
        inSidebar: false
      }
    ]
  },
  {
    id: 'demand-management',
    label: 'Demand management',
    path: '/demand-management',
    icon: <PersonSearchOutlinedIcon />,
    description: 'Demands and the staffing pipeline.',
    items: [
      {
        label: 'Demands',
        path: '/demands',
        description: 'Open and manage staffing demands',
        icon: <PersonSearchOutlinedIcon />,
        roles: DEMAND_ROLES
      },
      {
        label: 'Pipeline',
        path: '/demand-management/pipeline',
        description: 'Demand pipeline overview',
        icon: <TimelineOutlinedIcon />,
        roles: DEMAND_ROLES
      },
      {
        label: 'My meetings',
        path: '/my-meetings',
        description: 'Your scheduled demand meetings',
        icon: <EventOutlinedIcon />,
        roles: MEETING_PARTICIPANT_ROLES,
        inSidebar: false
      }
    ]
  },
  {
    id: 'intelligence',
    label: 'Workforce Intelligence',
    path: '/intelligence',
    icon: <TravelExploreOutlinedIcon />,
    description: 'Discovery, analytics, demand matching, recruiting figures and search costs.',
    items: [
      {
        label: 'Discovery',
        path: '/search',
        description: 'Structured, quick and AI search for internal employees',
        icon: <TravelExploreOutlinedIcon />,
        roles: SEARCH_ROLES
      },
      {
        label: 'Dashboard',
        path: '/intelligence/dashboard',
        description: 'Key workforce figures and charts',
        icon: <InsightsOutlinedIcon />,
        roles: INSIGHT_ROLES
      },
      {
        label: 'Experience analytics',
        path: '/intelligence/analytics',
        description: 'Project tenure and skill experience',
        icon: <TimelineOutlinedIcon />,
        roles: INSIGHT_ROLES
      },
      {
        label: 'Demand matching',
        path: '/intelligence/matching',
        description: 'Rank employees against must-have and optional criteria',
        icon: <RuleOutlinedIcon />,
        roles: MATCHING_ROLES
      },
      {
        label: 'External applicants',
        path: '/intelligence/applicants',
        description: 'Recruiting figures, names only',
        icon: <HowToRegOutlinedIcon />,
        roles: MATCHING_ROLES
      },
      {
        label: 'Usage & costs',
        path: '/intelligence/costs',
        description: 'Conventional vs AI search cost',
        icon: <PaidOutlinedIcon />,
        roles: COST_ROLES
      }
    ]
  },
  {
    id: 'administration',
    label: 'Administration',
    path: '/administration',
    icon: <AdminPanelSettingsOutlinedIcon />,
    description: 'Catalogs, organisation structure and access.',
    items: [
      {
        label: 'Skills',
        path: '/skills',
        description: 'Browse and manage the skill catalog',
        icon: <Inventory2OutlinedIcon />,
        roles: [UserRole.ADMIN]
      },
      {
        label: 'Skill categories',
        path: '/skill-categories',
        description: 'Manage skill categories',
        icon: <ListAltOutlinedIcon />,
        roles: [UserRole.ADMIN]
      },
      {
        label: 'Corporate structure',
        path: '/administration/corporate-structure',
        description: 'Corporate (horizontal) structure',
        icon: <AccountTreeOutlinedIcon />,
        roles: ADMIN_HR
      },
      {
        label: 'Market Structure',
        path: '/administration/market-structure',
        description: 'Market (vertical) structure',
        icon: <StorefrontOutlinedIcon />,
        roles: ADMIN_HR
      },
      {
        label: 'Organisation structure',
        path: '/administration/organisation-structure',
        description: 'Organisation structure',
        icon: <BusinessOutlinedIcon />,
        roles: ADMIN_HR
      },
      {
        label: 'Application access roles',
        path: '/administration/application-access-roles',
        description: 'Manage application access roles',
        icon: <HubOutlinedIcon />,
        roles: ADMIN_HR
      },
      {
        label: 'Employees',
        path: '/employees',
        description: 'Browse and manage employee records',
        icon: <PeopleAltOutlinedIcon />,
        roles: ADMIN_HR
      },
      {
        label: 'Audit Log',
        path: '/audit',
        description: 'Review recorded changes',
        icon: <SecurityOutlinedIcon />,
        roles: ADMIN_HR,
        inSidebar: false
      }
    ]
  }
];

export const getModuleItems = (module: NavigationModule, role: UserRole): NavigationItem[] =>
  module.items.filter((item) => item.roles.includes(role));

export const getVisibleModules = (role: UserRole): NavigationModule[] =>
  navigationModules.filter((module) => getModuleItems(module, role).length > 0);

export const getModuleById = (id: NavigationModuleId): NavigationModule => {
  const module = navigationModules.find((candidate) => candidate.id === id);
  if (!module) {
    throw new Error(`Unknown navigation module: ${id}`);
  }
  return module;
};

// Roles allowed to open a module dashboard: any role that is authorized for at least one of its items.
export const getModuleRoles = (id: NavigationModuleId): UserRole[] => {
  const module = getModuleById(id);
  return ALL_ROLES.filter((role) => getModuleItems(module, role).length > 0);
};

export const getNavigationRoles = (path: string): UserRole[] => {
  const item = navigationModules.flatMap((module) => module.items).find((candidate) => candidate.path === path);
  if (!item) {
    throw new Error(`Unknown navigation path: ${path}`);
  }
  return item.roles;
};

export const isPathActive = (pathname: string, path: string): boolean =>
  pathname === path || pathname.startsWith(`${path}/`);

export const isItemActive = (pathname: string, item: NavigationItem): boolean =>
  [item.path, ...(item.activePaths ?? [])].some((path) => isPathActive(pathname, path));
