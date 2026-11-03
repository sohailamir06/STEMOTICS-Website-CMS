import { Link, NavLink } from 'react-router';

// Main navigation from the live site (Phase 01 §4, Section 1). Links point at the existing
// WordPress paths (Decision D-10, Option A); pages are built in later stages.
// Stage 5 makes this menu staff-editable.
const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Courses', to: '/courses/' },
  { label: 'Camps', to: '/product-category/camps/' },
  { label: 'Competitions', to: '/product-category/competitions/' },
  { label: 'School Workshops', to: '/product-category/schools/' },
  { label: 'Birthday Party', to: '/product-category/birthday_party/' },
  { label: 'Gallery', to: '/image-gallery/' },
  { label: 'Contact Us', to: '/contact-us/' }
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4">
        <Link to="/" className="text-xl font-extrabold tracking-tight text-brand">
          STEMOTICS
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-5 text-sm font-medium">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    isActive ? 'text-brand' : 'text-body hover:text-brand'
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          to="/account/"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Register &amp; Login
        </Link>
      </div>
    </header>
  );
}
