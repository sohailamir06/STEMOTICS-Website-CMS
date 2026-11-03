import { useState } from 'react';
import {
  addMonths,
  formatLongDate,
  formatMonth,
  isAllowedStartDate,
  monthGrid,
  WEEKDAYS
} from '@stemotics/shared';

const MONTHS_AHEAD = 6;

// Brief §12: only dates on the time slot's weekday, from today onward, can be picked.
// Uses the same isAllowedStartDate() rule as the server. `today` comes from the server
// (Toronto date) so server and browser render the same calendar.
export function WeekdayDatePicker({ weekday, today, value, onChange }) {
  const firstMonth = today.slice(0, 7);
  const lastMonth = addMonths(firstMonth, MONTHS_AHEAD);
  const [month, setMonth] = useState(value ? value.slice(0, 7) : firstMonth);
  const weekdayLabel = WEEKDAYS[weekday - 1].label;

  return (
    <div className="rounded-card border border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="rounded px-2 py-1 text-sm hover:bg-surface-alt disabled:opacity-30"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= firstMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-ink" aria-live="polite">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm hover:bg-surface-alt disabled:opacity-30"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= lastMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <table className="w-full table-fixed text-center text-sm" role="grid">
        <caption className="sr-only">
          {formatMonth(month)}. Only {weekdayLabel}s can be selected.
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day.value} scope="col" className="pb-1 text-xs font-medium text-muted">
                <abbr title={day.label} className="no-underline">
                  {day.short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, index) => (
            <tr key={index}>
              {week.map((date, dayIndex) => {
                if (!date) return <td key={dayIndex} />;
                const allowed = isAllowedStartDate(date, weekday, today);
                const selected = date === value;
                return (
                  <td key={date} className="p-0.5">
                    <button
                      type="button"
                      disabled={!allowed}
                      aria-pressed={selected}
                      aria-label={formatLongDate(date)}
                      onClick={() => onChange(date)}
                      className={`h-9 w-full rounded-md ${
                        selected
                          ? 'bg-brand font-semibold text-white'
                          : allowed
                            ? 'font-semibold text-brand hover:bg-brand/10'
                            : 'cursor-not-allowed text-line'
                      }`}
                    >
                      {Number(date.slice(8))}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">
        Only {weekdayLabel}s are available for this time slot.
      </p>
    </div>
  );
}
