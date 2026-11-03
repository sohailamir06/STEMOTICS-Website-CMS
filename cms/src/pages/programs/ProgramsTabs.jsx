import { NavLink } from 'react-router';

const TABS = [
  { to: '/programs', label: 'Courses', end: true },
  { to: '/programs/time-slots', label: 'Time slots & capacity' }
];

export function ProgramsTabs() {
  return (
    <nav aria-label="Programs sections" className="mb-6 flex gap-1 border-b border-line">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              isActive ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-body'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
