import { Link } from 'react-router';

// Footer columns from the live site (Phase 01 §4, Section 12). Stage 5 makes them staff-editable.
const DEVELOP_YOUR_SKILLS = [
  'Investigating machines from engineering point of view',
  'Focusing on mechanical software design in a team',
  'Investigating machine mechanisms required to operate, using mathematics and physics',
  'Finding solutions for programmatic-mechanical optimization problems'
];

const ROBOTIC_VALUES = [
  'Develop procedural logical and creative thinking',
  'Ability to cope with malfunctions',
  'Mathematical and programming skills',
  'Motor skills and engineering analytics',
  'Social aptitude, self-confidence and sense of capability'
];

const QUICK_LINKS = [
  { label: 'FAQ', to: '/faq/' },
  { label: 'Camps', to: '/product-category/camps/' },
  { label: 'Video Gallery', to: '/video-gallery/' },
  { label: 'Image Gallery', to: '/image-gallery/' },
  { label: 'About Us', to: '/about-us/' },
  { label: 'Cancellation & Refund Policy', to: '/cancellation-refund-policy/' },
  { label: 'Partner With Us', to: '/partner-with-us/' }
];

export function Footer({ settings }) {
  return (
    <footer className="bg-footer text-sm text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <section>
          <h2 className="mb-3 font-semibold uppercase tracking-wide text-white">About Us</h2>
          <p>
            STEMOTICS is a specialized robotics center in Cambridge, Ontario. It aims to provide
            children and youngsters with the right skills to expedite their learning, especially in
            STEM-related fields, and express their creativity.
          </p>
          <Link to="/about-us/" className="mt-2 inline-block text-accent hover:underline">
            Read More
          </Link>
        </section>
        <section>
          <h2 className="mb-3 font-semibold uppercase tracking-wide text-white">
            Develop Your Skills
          </h2>
          <ul className="space-y-2">
            {DEVELOP_YOUR_SKILLS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-semibold uppercase tracking-wide text-white">Robotic Values</h2>
          <ul className="space-y-2">
            {ROBOTIC_VALUES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-semibold uppercase tracking-wide text-white">Quick Access</h2>
          <ul className="space-y-2">
            {QUICK_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {settings && (
            <address className="mt-4 not-italic">
              {settings.address.street}, {settings.address.city}, {settings.address.province}{' '}
              {settings.address.postalCode}
            </address>
          )}
        </section>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p>© {new Date().getFullYear()} STEMOTICS. All Rights Reserved.</p>
          {settings && (
            <ul className="flex gap-4">
              <li>
                <a
                  href={settings.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={settings.social.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href={settings.social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white"
                >
                  LinkedIn
                </a>
              </li>
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
