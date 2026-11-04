import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { UserRole } from '../types/enums';
import { useAuthStore } from '@store/authStore';
import Sidebar from './Sidebar';

const renderSidebarForRole = (role: UserRole, initialEntry = '/dashboard', includeLocation = false): void => {
  act(() => {
    useAuthStore.setState({
      token: 'token',
      user: {
        id: 'user-1',
        username: 'demo.user',
        email: 'demo@example.com',
        role,
        employeeId: 'employee-1'
      }
    });
  });

  render(
    <MemoryRouter initialEntries={[initialEntry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Sidebar />
      {includeLocation ? <LocationDisplay /> : null}
    </MemoryRouter>
  );
};

const moduleNames = ['Skill Matrix', 'Workforce', 'Demand management', 'Administration'];

const LocationDisplay = (): JSX.Element => {
  const { pathname } = useLocation();

  return <output data-testid="location">{pathname}</output>;
};

const expandAll = async (): Promise<void> => {
  const user = userEvent.setup();
  for (const name of moduleNames) {
    const toggle = screen.queryByRole('button', { name: `Expand ${name}` });
    if (toggle) {
      await user.click(toggle);
    }
  }
};

const submenuLinks = (name: string): string[] => {
  const header = screen.getByRole('link', { name });
  const group = header.closest('div') as HTMLElement;
  return within(group)
    .getAllByRole('link')
    .slice(1)
    .map((link) => link.textContent ?? '');
};

describe('Sidebar', () => {
  it('lists the four modules in order with the required submenus for admin', async () => {
    renderSidebarForRole(UserRole.ADMIN);
    await expandAll();

    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    const headers = within(nav)
      .getAllByRole('link')
      .map((link) => link.textContent)
      .filter((label) => moduleNames.includes(label ?? ''));
    expect(headers).toEqual(moduleNames);

    expect(submenuLinks('Skill Matrix')).toEqual(['My skills', 'My Team', 'Validation requests', 'Certifications']);
    expect(submenuLinks('Workforce')).toEqual(['Projects/Services', 'Allocations', 'Bench/Availability', 'HC view']);
    expect(submenuLinks('Demand management')).toEqual(['Demands', 'Pipeline']);
    expect(submenuLinks('Administration')).toEqual([
      'Skills',
      'Skill categories',
      'Corporate structure',
      'Market Structure',
      'Organisation structure',
      'Application access roles',
      'Employees'
    ]);
    ['Import', 'Projects', 'Bench', 'Availability'].forEach((label) =>
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    );
  });

  it('expands the group of the current route and toggles groups independently', async () => {
    renderSidebarForRole(UserRole.ADMIN, '/workforce/bench');
    const user = userEvent.setup();

    expect(screen.getByRole('link', { name: 'Bench/Availability' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Bench/Availability' })).toHaveAttribute('href', '/workforce/bench');
    expect(screen.queryByRole('link', { name: 'My skills' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand Skill Matrix' }));
    expect(screen.getByRole('link', { name: 'My skills' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Projects/Services' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse Workforce' }));
    expect(screen.queryByRole('link', { name: 'Projects/Services' })).not.toBeInTheDocument();
  });

  it('shows employee-safe navigation items for employees', async () => {
    renderSidebarForRole(UserRole.EMPLOYEE);
    await expandAll();

    expect(screen.getByRole('link', { name: 'Skill Matrix' })).toBeInTheDocument();
    expect(submenuLinks('Skill Matrix')).toEqual(['My skills', 'Certifications']);
    expect(screen.getByRole('link', { name: 'Workforce' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Demand management' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('applies hr and line manager visibility', async () => {
    renderSidebarForRole(UserRole.HR);
    await expandAll();

    expect(submenuLinks('Skill Matrix')).toEqual(['My skills', 'Certifications']);
    expect(submenuLinks('Administration')).toEqual([
      'Corporate structure',
      'Market Structure',
      'Organisation structure',
      'Application access roles',
      'Employees'
    ]);
    // HR only reaches My meetings (dashboard card), so the group has no submenu to expand.
    expect(screen.getByRole('link', { name: 'Demand management' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand Demand management' })).not.toBeInTheDocument();

    cleanup();
    renderSidebarForRole(UserRole.LINE_MANAGER);
    await expandAll();

    expect(submenuLinks('Skill Matrix')).toEqual(['My skills', 'My Team', 'Validation requests', 'Certifications']);
    expect(submenuLinks('Workforce')).toEqual(['Allocations', 'Bench/Availability']);
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
  });

  it('shows workforce and demand navigation for pmo, hrbp and management users', async () => {
    renderSidebarForRole(UserRole.PMO);
    await expandAll();
    expect(submenuLinks('Workforce')).toEqual(['Projects/Services', 'Allocations', 'Bench/Availability', 'HC view']);
    expect(submenuLinks('Demand management')).toEqual(['Demands', 'Pipeline']);
    expect(screen.queryByRole('link', { name: 'Administration' })).not.toBeInTheDocument();
    cleanup();

    renderSidebarForRole(UserRole.HR_BUSINESS_PARTNER);
    await expandAll();
    expect(submenuLinks('Workforce')).toEqual(['Projects/Services', 'Allocations', 'Bench/Availability', 'HC view']);
    cleanup();

    renderSidebarForRole(UserRole.MANAGEMENT);
    await expandAll();
    expect(submenuLinks('Demand management')).toEqual(['Demands', 'Pipeline']);
    expect(screen.queryByRole('link', { name: 'Workforce' })).not.toBeInTheDocument();
  });

  it('places the dropdown indicator left of the label and the module icon right of it', () => {
    renderSidebarForRole(UserRole.ADMIN);

    moduleNames.forEach((name) => {
      const toggle = screen.getByRole('button', { name: new RegExp(`^(Expand|Collapse) ${name}$`) });
      const link = screen.getByRole('link', { name });
      const label = within(link).getByText(name);
      const icon = link.querySelector('svg') as SVGElement;

      expect(toggle.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(label.compareDocumentPosition(icon) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('shows Search & Discovery as a primary item that opens the search page', async () => {
    renderSidebarForRole(UserRole.PMO, '/dashboard', true);
    const link = screen.getByRole('link', { name: 'Search & Discovery' });
    expect(link).toHaveAttribute('href', '/search');
    // A direct link, not a group: no expand toggle and no duplicate entry under Workforce Intelligence.
    expect(screen.queryByRole('button', { name: /Expand Search & Discovery/ })).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Expand Workforce Intelligence' });
    await userEvent.setup().click(toggle);
    expect(submenuLinks('Workforce Intelligence')).not.toContain('Search & Discovery');
    expect(screen.getAllByRole('link').filter((item) => item.getAttribute('href') === '/search')).toHaveLength(1);

    await userEvent.setup().click(link);
    expect(screen.getByTestId('location')).toHaveTextContent('/search');
    expect(screen.getByRole('link', { name: 'Search & Discovery' })).toHaveAttribute('aria-current', 'page');
  });

  it('hides Search & Discovery from roles without search access', () => {
    renderSidebarForRole(UserRole.EMPLOYEE);
    expect(screen.queryByRole('link', { name: 'Search & Discovery' })).not.toBeInTheDocument();
  });

  it('navigates to employees from the Employees tab', async () => {
    renderSidebarForRole(UserRole.ADMIN, '/dashboard', true);
    await expandAll();
    const user = userEvent.setup();

    await user.click(screen.getByRole('link', { name: 'Employees' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/employees');
  });
});
