import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CANCELLATION_NOTICE_DAYS,
  formatCents,
  formatLongDate,
  PRODUCT_TYPES
} from '@stemotics/shared';
import { WeekdayDatePicker } from './WeekdayDatePicker.jsx';

const fieldClass =
  'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

// Registration box on a regular program page: level → time slot → start date, then on to
// checkout. Full slots are disabled for every program sharing them (Brief §1); the date picker
// only offers the slot's weekday (Brief §12). Child details are entered at checkout, so names
// never end up in the URL.
export function BookingWidget({ course, today }) {
  const ids = useId();
  const [levelCode, setLevelCode] = useState(course.levels[0]?.code ?? '');
  const [slotId, setSlotId] = useState('');
  const [startDate, setStartDate] = useState('');
  const slot = course.timeSlots.find((item) => item.id === slotId);
  const isRegular = course.productType === PRODUCT_TYPES.REGULAR_PROGRAM;
  const allFull = course.timeSlots.length > 0 && course.timeSlots.every((item) => item.isFull);
  const navigate = useNavigate();
  const canContinue = Boolean(slot && startDate && (course.levels.length === 0 || levelCode));

  if (!isRegular) {
    return (
      <div className="rounded-card border border-line bg-surface-alt p-5 text-sm">
        Online registration for this program opens soon.
      </div>
    );
  }

  return (
    <form
      className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canContinue) return;
        const params = new URLSearchParams({ course: course.slug, slot: slotId, start: startDate });
        if (levelCode) params.set('level', levelCode);
        navigate(`/checkout/?${params}`);
      }}
    >
      <div>
        {course.monthlyFee !== null ? (
          <p className="text-2xl font-bold text-ink">
            {formatCents(course.monthlyFee)}{' '}
            <span className="text-base font-normal text-muted">/ month</span>
          </p>
        ) : (
          <p className="font-semibold text-ink">Contact us for pricing</p>
        )}
        <p className="mt-1 text-xs text-muted">
          Monthly subscription, charged on the same day each month from your start date.
          Cancellation needs {CANCELLATION_NOTICE_DAYS / 7} weeks’ notice before the next billing
          date.
        </p>
      </div>

      {course.levels.length > 0 && (
        <div>
          <label htmlFor={`${ids}-level`} className="mb-1 block text-sm font-semibold text-ink">
            Level
          </label>
          <select
            id={`${ids}-level`}
            className={fieldClass}
            value={levelCode}
            onChange={(e) => setLevelCode(e.target.value)}
          >
            {course.levels.map((level) => (
              <option key={level.code} value={level.code}>
                {level.name} [{level.code}]
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset>
        <legend className="mb-1 text-sm font-semibold text-ink">Day &amp; time</legend>
        {course.timeSlots.length === 0 && (
          <p className="text-sm text-muted">No time slots are open right now.</p>
        )}
        {allFull && <p className="mb-2 text-sm text-red-700">All time slots are currently full.</p>}
        <div className="grid max-h-72 gap-1.5 overflow-y-auto pr-1">
          {course.timeSlots.map((item) => (
            <label
              key={item.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                item.isFull
                  ? 'cursor-not-allowed border-line bg-surface-alt text-muted'
                  : item.id === slotId
                    ? 'cursor-pointer border-brand bg-brand/5'
                    : 'cursor-pointer border-line hover:border-brand/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="timeSlot"
                  value={item.id}
                  disabled={item.isFull}
                  checked={item.id === slotId}
                  onChange={() => {
                    setSlotId(item.id);
                    setStartDate(''); // the weekday may have changed
                  }}
                  className="accent-brand"
                />
                {item.label}
              </span>
              <span
                className={`text-xs font-semibold ${item.isFull ? 'text-red-700' : item.seatsLeft <= 2 ? 'text-amber-700' : 'text-muted'}`}
              >
                {item.isFull
                  ? 'Full'
                  : item.seatsLeft <= 2
                    ? `${item.seatsLeft} spots left`
                    : 'Available'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {slot && (
        <div>
          <p className="mb-1 text-sm font-semibold text-ink">Start date</p>
          <WeekdayDatePicker
            weekday={slot.dayOfWeek}
            today={today}
            value={startDate}
            onChange={setStartDate}
          />
          {startDate && <p className="mt-2 text-sm">Starting {formatLongDate(startDate)}</p>}
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={!canContinue}
          className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue to registration
        </button>
        {!canContinue && (
          <p className="mt-2 text-center text-xs text-muted">
            Choose {course.levels.length > 0 ? 'a level, ' : ''}a day &amp; time and a start date.
          </p>
        )}
      </div>
    </form>
  );
}
