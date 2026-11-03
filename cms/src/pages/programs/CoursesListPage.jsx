import { Link } from 'react-router';
import { can, formatCents, PRODUCT_TYPES } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { Alert, Badge, Loading, PageHeader } from '../../components/ui/index.jsx';
import { ProgramsTabs } from './ProgramsTabs.jsx';

const TYPE_LABELS = {
  [PRODUCT_TYPES.REGULAR_PROGRAM]: 'Regular program',
  [PRODUCT_TYPES.CAMP]: 'Camp',
  [PRODUCT_TYPES.ONE_TIME]: 'One-time'
};

function priceText(course) {
  if (course.productType === PRODUCT_TYPES.REGULAR_PROGRAM) {
    return course.monthlyFee === null
      ? 'Price not set'
      : `${formatCents(course.monthlyFee)} / month`;
  }
  return course.oneTimeFee === null ? 'Price not set' : formatCents(course.oneTimeFee);
}

export default function CoursesListPage() {
  const { user } = useAuth();
  const { data, error, loading } = useApiData('/admin/courses');
  const canEdit = can(user.role, 'programs.edit');

  return (
    <>
      <PageHeader
        title="Programs & Camps"
        description="Courses offered on the website. Inactive courses are hidden from the site but kept for past orders."
        actions={
          canEdit && (
            <Link
              to="/programs/new"
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Add course
            </Link>
          )
        }
      />
      <ProgramsTabs />
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Ages</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Time slots</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.courses.map((course) => (
                <tr key={course.id} className="hover:bg-surface-alt/60">
                  <td className="px-4 py-3">
                    <Link
                      to={`/programs/${course.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{course.code}</td>
                  <td className="px-4 py-3">{TYPE_LABELS[course.productType]}</td>
                  <td className="px-4 py-3">
                    {course.ageMin !== null ? `${course.ageMin}–${course.ageMax}` : '—'}
                  </td>
                  <td className="px-4 py-3">{priceText(course)}</td>
                  <td className="px-4 py-3">{course.timeSlots.length || '—'}</td>
                  <td className="px-4 py-3">
                    {course.isActive ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge>Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {data.courses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    No courses yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
