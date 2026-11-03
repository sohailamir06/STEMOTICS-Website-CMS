import { Form, Link, useLocation, useNavigation, useSubmit } from 'react-router';

// Brief §6 filter sidebar. A plain GET form, so filtering works even before JavaScript loads;
// with JavaScript it re-filters as soon as a box is ticked. Selected filters live in the URL,
// so filtered views can be shared and bookmarked.
export function FilterSidebar({ groups }) {
  const submit = useSubmit();
  const location = useLocation();
  const navigation = useNavigation();
  // Checkboxes follow the URL — the pending one while results load, so clicks feel instant.
  const params = new URLSearchParams(navigation.location?.search ?? location.search);
  const isChecked = (group, option) =>
    params
      .getAll(group.slug)
      .flatMap((value) => value.split(','))
      .includes(option.slug);

  return (
    <Form
      method="get"
      onChange={(event) => submit(event.currentTarget, { preventScrollReset: true, replace: true })}
      aria-label="Filter courses"
      className="space-y-6"
    >
      {groups.map((group) => (
        <fieldset key={group.id}>
          <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink">
            {group.name}
          </legend>
          <div className="space-y-1.5">
            {group.options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={group.slug}
                  value={option.slug}
                  checked={isChecked(group, option)}
                  onChange={() => {}} // the form's onChange submits
                  className="size-4 accent-brand"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <noscript>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          Apply filters
        </button>
      </noscript>
    </Form>
  );
}

// "Ages 6-8 ×" chips for the active filters, each removing just that filter.
export function ActiveFilters({ groups, selected }) {
  const chips = groups.flatMap((group) =>
    group.options
      .filter((option) => selected[group.slug]?.includes(option.slug))
      .map((option) => ({ group, option }))
  );
  if (chips.length === 0) return null;

  const hrefWithout = (groupSlug, optionSlug) => {
    const params = new URLSearchParams();
    for (const [slug, values] of Object.entries(selected)) {
      for (const value of values) {
        if (!(slug === groupSlug && value === optionSlug)) params.append(slug, value);
      }
    }
    const query = params.toString();
    return query ? `?${query}` : '.';
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map(({ group, option }) => (
        <Link
          key={`${group.slug}-${option.slug}`}
          to={hrefWithout(group.slug, option.slug)}
          preventScrollReset
          className="rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-sm text-brand hover:bg-brand/10"
          aria-label={`Remove filter ${option.label}`}
        >
          {option.label} <span aria-hidden="true">×</span>
        </Link>
      ))}
      <Link to="." preventScrollReset className="text-sm text-muted underline hover:text-body">
        Clear all
      </Link>
    </div>
  );
}
