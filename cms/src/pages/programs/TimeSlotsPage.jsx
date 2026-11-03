import { useState } from 'react';
import { z } from 'zod';
import { can, DEFAULT_SLOT_CAPACITY, timeSlotSchema, WEEKDAYS } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { api } from '../../lib/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  inputClass,
  Loading,
  PageHeader
} from '../../components/ui/index.jsx';
import { ProgramsTabs } from './ProgramsTabs.jsx';

function SeatStatus({ slot }) {
  if (!slot.isActive) return <Badge>Inactive</Badge>;
  if (slot.isFull) return <Badge tone="danger">Full</Badge>;
  if (slot.seatsLeft <= 2) return <Badge tone="warning">{slot.seatsLeft} left</Badge>;
  return <Badge tone="success">{slot.seatsLeft} left</Badge>;
}

function CapacityEditor({ slot, onSaved, disabled }) {
  const [value, setValue] = useState(String(slot.capacity));
  const [error, setError] = useState(null);
  const changed = value !== String(slot.capacity);

  async function save() {
    setError(null);
    try {
      await api(`/admin/time-slots/${slot.id}`, {
        method: 'PATCH',
        body: { capacity: Number(value) }
      });
      onSaved();
    } catch (err) {
      setError(err.details?.capacity?.[0] ?? err.message);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          max="100"
          aria-label={`Capacity for ${slot.label}`}
          className={`${inputClass} w-20`}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
        />
        {changed && !disabled && (
          <Button size="sm" onClick={save}>
            Save
          </Button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

function AddSlotForm({ onCreated }) {
  const [form, setForm] = useState({
    dayOfWeek: '1',
    startTime: '17:00',
    endTime: '18:00',
    capacity: String(DEFAULT_SLOT_CAPACITY)
  });
  const [errors, setErrors] = useState({});

  async function submit(event) {
    event.preventDefault();
    const parsed = timeSlotSchema.safeParse({
      dayOfWeek: Number(form.dayOfWeek),
      startTime: form.startTime,
      endTime: form.endTime,
      capacity: Number(form.capacity)
    });
    if (!parsed.success) return setErrors(z.flattenError(parsed.error).fieldErrors);
    try {
      await api('/admin/time-slots', { method: 'POST', body: parsed.data });
      setErrors({});
      onCreated();
    } catch (err) {
      setErrors({
        ...(err.details ?? {}),
        _form:
          err.code === 'DUPLICATE'
            ? 'A time slot already starts at that day and time.'
            : err.message
      });
    }
  }

  const set = (field) => (e) => setForm((current) => ({ ...current, [field]: e.target.value }));

  return (
    <Card className="mb-6">
      <h2 className="mb-3 font-semibold text-ink">Add a time slot</h2>
      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <Field id="new-day" label="Day" error={errors.dayOfWeek}>
          {(props) => (
            <select
              {...props}
              className={inputClass}
              value={form.dayOfWeek}
              onChange={set('dayOfWeek')}
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="new-start" label="Start" error={errors.startTime}>
          {(props) => (
            <input
              {...props}
              type="time"
              className={inputClass}
              value={form.startTime}
              onChange={set('startTime')}
            />
          )}
        </Field>
        <Field id="new-end" label="End" error={errors.endTime}>
          {(props) => (
            <input
              {...props}
              type="time"
              className={inputClass}
              value={form.endTime}
              onChange={set('endTime')}
            />
          )}
        </Field>
        <Field id="new-capacity" label="Capacity" error={errors.capacity}>
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              className={inputClass}
              value={form.capacity}
              onChange={set('capacity')}
            />
          )}
        </Field>
        <div className="pt-6">
          <Button type="submit">Add slot</Button>
        </div>
        {errors._form && (
          <div className="sm:col-span-2 lg:col-span-5">
            <Alert>{errors._form}</Alert>
          </div>
        )}
      </form>
    </Card>
  );
}

export default function TimeSlotsPage() {
  const { user } = useAuth();
  const canEdit = can(user.role, 'programs.edit');
  const { data, error, loading, reload } = useApiData('/admin/time-slots');
  const [actionError, setActionError] = useState(null);

  async function run(action) {
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Programs & Camps"
        description={`Capacity is per time slot and shared by every regular program in it (default ${DEFAULT_SLOT_CAPACITY}). When a slot is full it closes for all programs, and reopens automatically when a seat frees up or you raise the capacity.`}
      />
      <ProgramsTabs />
      {canEdit && <AddSlotForm onCreated={reload} />}
      {actionError && (
        <div className="mb-4">
          <Alert>{actionError}</Alert>
        </div>
      )}
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Time slot</th>
                <th className="px-4 py-3">Capacity</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Courses</th>
                {canEdit && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.timeSlots.map((slot) => (
                <tr key={slot.id}>
                  <td className="px-4 py-3 font-medium text-ink">{slot.label}</td>
                  <td className="px-4 py-3">
                    <CapacityEditor
                      key={slot.capacity}
                      slot={slot}
                      onSaved={reload}
                      disabled={!canEdit}
                    />
                  </td>
                  <td className="px-4 py-3">{slot.occupiedCount}</td>
                  <td className="px-4 py-3">
                    <SeatStatus slot={slot} />
                  </td>
                  <td className="px-4 py-3">{slot.courseCount}</td>
                  {canEdit && (
                    <td className="space-x-2 whitespace-nowrap px-4 py-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          run(() =>
                            api(`/admin/time-slots/${slot.id}`, {
                              method: 'PATCH',
                              body: { isActive: !slot.isActive }
                            })
                          )
                        }
                      >
                        {slot.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={slot.courseCount > 0}
                        title={
                          slot.courseCount > 0
                            ? 'Remove this slot from its courses first, or deactivate it.'
                            : undefined
                        }
                        onClick={() => {
                          if (window.confirm(`Delete ${slot.label}?`)) {
                            run(() => api(`/admin/time-slots/${slot.id}`, { method: 'DELETE' }));
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
