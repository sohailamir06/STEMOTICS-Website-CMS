import { Link, useLoaderData } from 'react-router';
import { todayInToronto } from '@stemotics/shared';
import { apiGet, rethrowNotFound } from '../lib/api.server.js';
import { BookingWidget } from '../components/booking/BookingWidget.jsx';

export function meta({ loaderData }) {
  if (!loaderData) return [{ title: 'Course not found | STEMOTICS' }];
  const { course } = loaderData;
  return [
    { title: `${course.title} [${course.code}] | STEMOTICS` },
    {
      name: 'description',
      content: course.summary || `${course.title} at STEMOTICS, Cambridge, Ontario.`
    }
  ];
}

export async function loader({ params, request }) {
  try {
    const { course } = await apiGet(`/courses/${encodeURIComponent(params.slug)}`, request);
    // Toronto "today" from the server, so the calendar renders the same on server and browser.
    return { course, today: todayInToronto() };
  } catch (err) {
    rethrowNotFound(err);
  }
}

// Seat counts change all the time: never let a browser or CDN cache this page.
export function headers() {
  return { 'Cache-Control': 'no-store' };
}

export default function Product() {
  const { course, today } = useLoaderData();
  const ageTag = course.ageMin !== null ? `Ages ${course.ageMin}–${course.ageMax}` : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex gap-2">
          <li>
            <Link to="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/courses/" className="hover:underline">
              Courses
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-body">
            {course.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <article>
          <h1 className="text-3xl font-bold text-ink">
            {course.title}{' '}
            <span className="font-mono text-lg font-normal text-muted">[{course.code}]</span>
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {ageTag && (
              <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                {ageTag}
              </span>
            )}
            {course.tags
              .filter((tag) => tag.group === 'course-categories' || tag.group === 'difficulty')
              .map((tag) => (
                <span
                  key={tag.slug}
                  className="rounded-full bg-accent/50 px-3 py-1 text-sm font-semibold text-ink"
                >
                  {tag.label}
                </span>
              ))}
          </div>
          {course.summary && <p className="mt-6 text-lg">{course.summary}</p>}
          {course.description && (
            <div className="mt-6 whitespace-pre-line">{course.description}</div>
          )}

          {course.levels.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xl font-semibold text-ink">Levels</h2>
              <ul className="mt-3 divide-y divide-line rounded-card border border-line">
                {course.levels.map((level) => (
                  <li key={level.code} className="flex justify-between px-4 py-3 text-sm">
                    <span>{level.name}</span>
                    <span className="font-mono text-muted">{level.code}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside aria-label="Register">
          <div className="lg:sticky lg:top-24">
            <BookingWidget course={course} today={today} />
          </div>
        </aside>
      </div>
    </div>
  );
}
