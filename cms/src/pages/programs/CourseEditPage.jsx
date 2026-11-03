import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { can, courseSchema, PRODUCT_TYPES, slugify, WEEKDAYS } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { api } from '../../lib/api.js';
import { centsToInput, inputToCents } from '../../lib/money.js';
import {
  Alert,
  Button,
  Card,
  Field,
  inputClass,
  Loading,
  PageHeader
} from '../../components/ui/index.jsx';

const EMPTY_COURSE = {
  title: '',
  code: '',
  slug: '',
  productType: PRODUCT_TYPES.REGULAR_PROGRAM,
  summary: '',
  description: '',
  ageMin: '',
  ageMax: '',
  levels: [],
  monthlyFee: '',
  oneTimeFee: '',
  timeSlots: [],
  filterOptions: [],
  isActive: true
};

function toForm(course) {
  return {
    ...course,
    ageMin: course.ageMin ?? '',
    ageMax: course.ageMax ?? '',
    monthlyFee: centsToInput(course.monthlyFee),
    oneTimeFee: centsToInput(course.oneTimeFee)
  };
}

const toNumberOrNull = (value) => (value === '' ? null : Number(value));

function toPayload(form) {
  const isRegular = form.productType === PRODUCT_TYPES.REGULAR_PROGRAM;
  return {
    title: form.title,
    code: form.code,
    slug: form.slug,
    productType: form.productType,
    summary: form.summary,
    description: form.description,
    ageMin: toNumberOrNull(form.ageMin),
    ageMax: toNumberOrNull(form.ageMax),
    levels: form.levels.filter((level) => level.name || level.code),
    monthlyFee: isRegular ? inputToCents(form.monthlyFee) : null,
    oneTimeFee: isRegular ? null : inputToCents(form.oneTimeFee),
    timeSlots: isRegular ? form.timeSlots : [],
    filterOptions: form.filterOptions,
    isActive: form.isActive
  };
}

function toggle(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function CourseEditPage() {
  const { id } = useParams();
  const isNew = id === undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = can(user.role, 'programs.edit');

  const [form, setForm] = useState(EMPTY_COURSE);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [refs, setRefs] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/admin/time-slots'),
      api('/admin/filter-groups'),
      isNew ? null : api(`/admin/courses/${id}`)
    ])
      .then(([slots, filters, existing]) => {
        setRefs({ timeSlots: slots.timeSlots, groups: filters.groups });
        if (existing) setForm(toForm(existing.course));
      })
      .catch(setLoadError);
  }, [id, isNew]);

  const slotsByDay = useMemo(() => {
    const byDay = new Map();
    for (const slot of refs?.timeSlots ?? []) {
      byDay.set(slot.dayOfWeek, [...(byDay.get(slot.dayOfWeek) ?? []), slot]);
    }
    return byDay;
  }, [refs]);

  function update(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  }

  function updateLevel(index, field, value) {
    setForm((current) => ({
      ...current,
      levels: current.levels.map((level, i) => (i === index ? { ...level, [field]: value } : level))
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    const payload = toPayload(form);

    const priceErrors = {};
    if (Number.isNaN(payload.monthlyFee)) priceErrors.monthlyFee = ['Enter an amount like 129.99'];
    if (Number.isNaN(payload.oneTimeFee)) priceErrors.oneTimeFee = ['Enter an amount like 24.99'];
    const parsed = courseSchema.safeParse(payload);
    if (!parsed.success || Object.keys(priceErrors).length) {
      setErrors({
        ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
        ...priceErrors
      });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const { course } = await api(isNew ? '/admin/courses' : `/admin/courses/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: parsed.data
      });
      if (isNew) {
        navigate(`/programs/${course.id}`, { replace: true });
      } else {
        setForm(toForm(course));
        setMessage('Saved.');
      }
    } catch (err) {
      setErrors({ ...(err.details ?? {}), _form: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Alert>{loadError.message}</Alert>;
  if (!refs) return <Loading />;

  const isRegular = form.productType === PRODUCT_TYPES.REGULAR_PROGRAM;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PageHeader
        title={isNew ? 'Add course' : form.title || 'Edit course'}
        description={
          canEdit
            ? undefined
            : 'You can view this course. Only Program Managers and Super Admins can edit it.'
        }
        actions={
          <>
            <Link
              to="/programs"
              className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface-alt"
            >
              Back to courses
            </Link>
            {canEdit && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save course'}
              </Button>
            )}
          </>
        }
      />

      <div className="space-y-4">
        {errors._form && <Alert>{errors._form}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}

        <fieldset disabled={!canEdit} className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold text-ink">Basics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field id="title" label="Title" error={errors.title}>
                {(props) => (
                  <input
                    {...props}
                    className={inputClass}
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="productType"
                label="Type"
                error={errors.productType}
                hint="Decides billing: regular programs are monthly and use time slots."
              >
                {(props) => (
                  <select
                    {...props}
                    className={inputClass}
                    value={form.productType}
                    onChange={(e) => update('productType', e.target.value)}
                  >
                    <option value={PRODUCT_TYPES.REGULAR_PROGRAM}>Regular program (monthly)</option>
                    <option value={PRODUCT_TYPES.CAMP}>Camp</option>
                    <option value={PRODUCT_TYPES.ONE_TIME}>
                      One-time (workshop, party, trial…)
                    </option>
                  </select>
                )}
              </Field>
              <Field id="code" label="Product code" error={errors.code} hint="e.g. STC2001">
                {(props) => (
                  <input
                    {...props}
                    className={`${inputClass} font-mono uppercase`}
                    value={form.code}
                    onChange={(e) => update('code', e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="slug"
                label="Web address"
                error={errors.slug}
                hint={`stemotics.com/product/${form.slug || '…'}/`}
              >
                {(props) => (
                  <input
                    {...props}
                    className={`${inputClass} font-mono`}
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      update('slug', e.target.value);
                    }}
                  />
                )}
              </Field>
              <Field id="ageMin" label="Minimum age" error={errors.ageMin}>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="2"
                    max="18"
                    className={inputClass}
                    value={form.ageMin}
                    onChange={(e) => update('ageMin', e.target.value)}
                  />
                )}
              </Field>
              <Field id="ageMax" label="Maximum age" error={errors.ageMax}>
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="2"
                    max="18"
                    className={inputClass}
                    value={form.ageMax}
                    onChange={(e) => update('ageMax', e.target.value)}
                  />
                )}
              </Field>
              {isRegular ? (
                <Field
                  id="monthlyFee"
                  label="Monthly fee ($)"
                  error={errors.monthlyFee}
                  hint="Charged every month from the start date. Leave empty if not decided."
                >
                  {(props) => (
                    <input
                      {...props}
                      inputMode="decimal"
                      className={inputClass}
                      value={form.monthlyFee}
                      onChange={(e) => update('monthlyFee', e.target.value)}
                    />
                  )}
                </Field>
              ) : (
                <Field id="oneTimeFee" label="Price ($)" error={errors.oneTimeFee}>
                  {(props) => (
                    <input
                      {...props}
                      inputMode="decimal"
                      className={inputClass}
                      value={form.oneTimeFee}
                      onChange={(e) => update('oneTimeFee', e.target.value)}
                    />
                  )}
                </Field>
              )}
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                  />
                  Active (shown on the website)
                </label>
              </div>
            </div>
            <div className="mt-4 grid gap-4">
              <Field
                id="summary"
                label="Short summary"
                error={errors.summary}
                hint="Shown on course cards. Up to 300 characters."
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={2}
                    className={inputClass}
                    value={form.summary}
                    onChange={(e) => update('summary', e.target.value)}
                  />
                )}
              </Field>
              <Field
                id="description"
                label="Description"
                error={errors.description}
                hint="Full course description. Rich-text editing arrives with the content editor (Stage 5)."
              >
                {(props) => (
                  <textarea
                    {...props}
                    rows={6}
                    className={inputClass}
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                  />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink">Levels</h2>
            <p className="mb-4 text-sm text-muted">
              Optional, e.g. Coding Junior Level 1–4. Parents choose a level when registering.
            </p>
            {errors.levels && <p className="mb-2 text-sm text-red-700">{errors.levels[0]}</p>}
            <div className="space-y-2">
              {form.levels.map((level, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    aria-label={`Level ${index + 1} name`}
                    placeholder="Level name"
                    className={inputClass}
                    value={level.name}
                    onChange={(e) => updateLevel(index, 'name', e.target.value)}
                  />
                  <input
                    aria-label={`Level ${index + 1} code`}
                    placeholder="Code"
                    className={`${inputClass} max-w-40 font-mono uppercase`}
                    value={level.code}
                    onChange={(e) => updateLevel(index, 'code', e.target.value)}
                  />
                  <Button
                    variant="danger"
                    onClick={() =>
                      update(
                        'levels',
                        form.levels.filter((_, i) => i !== index)
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => update('levels', [...form.levels, { name: '', code: '' }])}
            >
              Add level
            </Button>
          </Card>

          {isRegular && (
            <Card>
              <h2 className="font-semibold text-ink">Time slots offered</h2>
              <p className="mb-4 text-sm text-muted">
                Capacity is shared by every program in a slot and managed under “Time slots &amp;
                capacity”.
              </p>
              {errors.timeSlots && (
                <p className="mb-2 text-sm text-red-700">{errors.timeSlots[0]}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {WEEKDAYS.filter((day) => slotsByDay.has(day.value)).map((day) => (
                  <fieldset key={day.value}>
                    <legend className="mb-1 text-sm font-semibold text-body">{day.label}</legend>
                    {slotsByDay.get(day.value).map((slot) => (
                      <label key={slot.id} className="flex items-center gap-2 py-0.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.timeSlots.includes(slot.id)}
                          onChange={() => update('timeSlots', toggle(form.timeSlots, slot.id))}
                        />
                        {slot.label.replace(`${day.label} `, '')}
                        {!slot.isActive && <span className="text-xs text-muted">(inactive)</span>}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold text-ink">Filters</h2>
            <p className="mb-4 text-sm text-muted">
              Tick every option that applies. The course listing filters by these.
            </p>
            {errors.filterOptions && (
              <p className="mb-2 text-sm text-red-700">{errors.filterOptions[0]}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {refs.groups.map((group) => (
                <fieldset key={group.id}>
                  <legend className="mb-1 text-sm font-semibold text-body">
                    {group.name}{' '}
                    {!group.isActive && (
                      <span className="text-xs font-normal text-muted">(hidden)</span>
                    )}
                  </legend>
                  {group.options.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <input
                        type="checkbox"
                        checked={form.filterOptions.includes(option.id)}
                        onChange={() =>
                          update('filterOptions', toggle(form.filterOptions, option.id))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </Card>
        </fieldset>
      </div>
    </form>
  );
}
