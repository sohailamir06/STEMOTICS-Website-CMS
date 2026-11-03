import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'STEMOTICS | Robotics, Coding & STEM Programs in Cambridge, Ontario' },
    {
      name: 'description',
      content:
        'Hands-on robotics, coding, digital design and game design programs, camps and competitions for kids in Cambridge, Ontario.'
    }
  ];
}

// Stage 0 placeholder using live-site copy (Phase 01 §4, Sections 2–3).
// Stage 5 replaces this with the staff-editable homepage (Brief §7).
export default function Home() {
  return (
    <>
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-7xl px-4 py-24">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Excite | Inspire | Motivate Learning
          </h1>
          <Link
            to="/courses/"
            className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 font-bold text-ink hover:bg-accent-dark"
          >
            Join Now
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h2 className="text-3xl font-bold text-ink">
          STEM EDUCATION THROUGH PROJECT-BASED LEARNING
        </h2>
        <p className="mt-4 text-lg">
          The future holds challenges, where innovation, originality and ability to work in a team
          will serve as key competitive parameters. STEMOTICS gives children the opportunity to
          learn STEM through robotics.
        </p>
      </section>
    </>
  );
}
