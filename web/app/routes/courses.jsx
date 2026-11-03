import { useLoaderData } from 'react-router';
import { apiGet } from '../lib/api.server.js';
import { CourseCard } from '../components/courses/CourseCard.jsx';
import { ActiveFilters, FilterSidebar } from '../components/courses/FilterSidebar.jsx';

export function meta() {
  return [
    { title: 'Courses | STEMOTICS' },
    {
      name: 'description',
      content:
        'Robotics, coding, digital design, game design and AI courses for kids aged 4–15 in Cambridge, Ontario. Filter by age, category and level.'
    }
  ];
}

// Filters arrive as URL query params and are passed straight to the API (Brief §6).
export async function loader({ request }) {
  const query = new URL(request.url).search;
  const [{ groups }, { courses, selected }] = await Promise.all([
    apiGet('/filters', request),
    apiGet(`/courses${query}`, request)
  ]);
  return { groups, courses, selected };
}

export default function Courses() {
  const { groups, courses, selected } = useLoaderData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold text-ink">STEMOTICS Courses</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Hands-on programs for every age group. Choose filters to narrow the list.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="rounded-card border border-line p-4 lg:hidden">
            <summary className="cursor-pointer font-semibold text-ink">Filters</summary>
            <div className="mt-4">
              <FilterSidebar groups={groups} />
            </div>
          </details>
          <div className="hidden lg:block">
            <FilterSidebar groups={groups} />
          </div>
        </aside>

        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="sr-only">
            Results
          </h2>
          <ActiveFilters groups={groups} selected={selected} />
          <p className="mb-4 text-sm text-muted" aria-live="polite">
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
          </p>
          {courses.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <li key={course.slug}>
                  <CourseCard course={course} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-card border border-line p-8 text-center text-muted">
              No courses match these filters. Try removing one.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
