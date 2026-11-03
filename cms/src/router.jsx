import { createBrowserRouter, Link } from 'react-router';
import App from './App.jsx';
import { RequireAuth, RoleGate } from './components/layout/RoleGate.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/dashboard/DashboardPage.jsx';
import ComingSoonPage from './pages/ComingSoonPage.jsx';
import CoursesListPage from './pages/programs/CoursesListPage.jsx';
import CourseEditPage from './pages/programs/CourseEditPage.jsx';
import TimeSlotsPage from './pages/programs/TimeSlotsPage.jsx';
import FilterGroupsPage from './pages/filters/FilterGroupsPage.jsx';
import StaffUsersPage from './pages/settings/StaffUsersPage.jsx';
import SubscriptionsPage from './pages/payments/SubscriptionsPage.jsx';
import OrdersPage from './pages/payments/OrdersPage.jsx';
import { MODULES } from './lib/permissions.js';

function NotFoundPage() {
  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <h1 className="text-xl font-semibold text-ink">Page not found</h1>
      <Link to="/" className="mt-2 inline-block text-brand underline">
        Back to dashboard
      </Link>
    </div>
  );
}

const gated = (moduleKey, element) => <RoleGate moduleKey={moduleKey}>{element}</RoleGate>;

// Built modules (Stages 1–2).
const moduleRoutes = [
  { path: 'programs', element: gated('programs', <CoursesListPage />) },
  { path: 'programs/new', element: gated('programs', <CourseEditPage />) },
  { path: 'programs/time-slots', element: gated('programs', <TimeSlotsPage />) },
  { path: 'programs/:id', element: gated('programs', <CourseEditPage />) },
  { path: 'filters', element: gated('filters', <FilterGroupsPage />) },
  { path: 'settings', element: gated('settings', <StaffUsersPage />) },
  { path: 'payments', element: gated('payments', <SubscriptionsPage />) },
  { path: 'payments/orders', element: gated('payments', <OrdersPage />) }
];

// Modules from later stages show a placeholder until they are built.
const placeholderRoutes = MODULES.filter((module) => !module.ready).map((module) => ({
  path: `${module.path.slice(1)}/*`,
  element: <ComingSoonPage moduleKey={module.key} />
}));

export const router = createBrowserRouter(
  [
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <App />,
          children: [
            { index: true, element: <DashboardPage /> },
            ...moduleRoutes,
            ...placeholderRoutes,
            { path: '*', element: <NotFoundPage /> }
          ]
        }
      ]
    }
  ],
  { basename: '/admin' }
);
