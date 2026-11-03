import { Link } from 'react-router';
import { formatCents, PRODUCT_TYPES } from '@stemotics/shared';

export function priceLabel(course) {
  if (course.productType === PRODUCT_TYPES.REGULAR_PROGRAM && course.monthlyFee !== null) {
    return `${formatCents(course.monthlyFee)} / month`;
  }
  if (course.productType !== PRODUCT_TYPES.REGULAR_PROGRAM && course.oneTimeFee !== null) {
    return formatCents(course.oneTimeFee);
  }
  return null;
}

// Tags shown as pills on cards: age and category first, as parents scan for those.
const PILL_GROUPS = ['age-level', 'course-categories', 'difficulty'];

export function CourseCard({ course }) {
  const pills = course.tags
    .filter((tag) => PILL_GROUPS.includes(tag.group))
    .sort((a, b) => PILL_GROUPS.indexOf(a.group) - PILL_GROUPS.indexOf(b.group));
  const price = priceLabel(course);

  return (
    <article className="group relative flex h-full flex-col rounded-card border border-line bg-surface p-5 transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {pills.map((tag) => (
          <span
            key={`${tag.group}-${tag.slug}`}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              tag.group === 'age-level' ? 'bg-brand/10 text-brand' : 'bg-accent/50 text-ink'
            }`}
          >
            {tag.label}
          </span>
        ))}
      </div>
      <h2 className="text-lg font-semibold text-ink">
        <Link
          to={`/product/${course.slug}/`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          <span className="relative">{course.title}</span>
        </Link>
      </h2>
      <p className="mt-0.5 font-mono text-xs text-muted">[{course.code}]</p>
      {course.summary && <p className="mt-3 text-sm">{course.summary}</p>}
      <div className="mt-auto flex items-center justify-between pt-4 text-sm">
        <span className="font-semibold text-ink">{price ?? ''}</span>
        <span className="font-semibold text-brand group-hover:underline">View details →</span>
      </div>
    </article>
  );
}
