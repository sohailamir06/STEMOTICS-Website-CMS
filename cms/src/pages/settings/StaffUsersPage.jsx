import { useState } from 'react';
import { z } from 'zod';
import { ROLE_LABELS, STAFF_ROLES, staffCreateSchema } from '@stemotics/shared';
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

const EMPTY = { email: '', firstName: '', lastName: '', role: 'program_manager', password: '' };

function RoleSelect({ id, value, onChange, ...props }) {
  return (
    <select
      id={id}
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {STAFF_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}

function AddStaffForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    const parsed = staffCreateSchema.safeParse(form);
    if (!parsed.success) return setErrors(z.flattenError(parsed.error).fieldErrors);
    try {
      await api('/admin/staff', { method: 'POST', body: parsed.data });
      setForm(EMPTY);
      setErrors({});
      onCreated(parsed.data.email);
    } catch (err) {
      setErrors({ ...(err.details ?? {}), _form: err.message });
    }
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-1 font-semibold text-ink">Add a staff member</h2>
      <p className="mb-4 text-sm text-muted">
        Give them the temporary password privately; they can change it later.
      </p>
      <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field id="staff-first" label="First name" error={errors.firstName}>
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={form.firstName}
              onChange={(e) => set('firstName')(e.target.value)}
            />
          )}
        </Field>
        <Field id="staff-last" label="Last name" error={errors.lastName}>
          {(props) => (
            <input
              {...props}
              className={inputClass}
              value={form.lastName}
              onChange={(e) => set('lastName')(e.target.value)}
            />
          )}
        </Field>
        <Field id="staff-email" label="Email" error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          )}
        </Field>
        <Field id="staff-role" label="Role" error={errors.role}>
          {(props) => <RoleSelect {...props} value={form.role} onChange={set('role')} />}
        </Field>
        <Field
          id="staff-password"
          label="Temporary password"
          error={errors.password}
          hint="At least 10 characters."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              autoComplete="new-password"
              className={inputClass}
              value={form.password}
              onChange={(e) => set('password')(e.target.value)}
            />
          )}
        </Field>
        <div className="pt-6">
          <Button type="submit">Add staff member</Button>
        </div>
        {errors._form && (
          <div className="md:col-span-2 lg:col-span-3">
            <Alert>{errors._form}</Alert>
          </div>
        )}
      </form>
    </Card>
  );
}

function PasswordReset({ staff, onDone }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Set password
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api(`/admin/staff/${staff.id}`, { method: 'PATCH', body: { password } });
          setOpen(false);
          setPassword('');
          onDone(`New password set for ${staff.email}. They have been signed out everywhere.`);
        } catch (err) {
          setError(err.details?.password?.[0] ?? err.message);
        }
      }}
    >
      <input
        aria-label={`New password for ${staff.email}`}
        type="text"
        autoComplete="new-password"
        className={`${inputClass} w-48`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button size="sm" type="submit">
        Save
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </form>
  );
}

export default function StaffUsersPage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApiData('/admin/staff');
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function update(staff, body, message) {
    setActionError(null);
    setNotice(null);
    try {
      await api(`/admin/staff/${staff.id}`, { method: 'PATCH', body });
      await reload();
      setNotice(message);
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Staff & Settings"
        description="Staff accounts and their roles. Deactivated staff cannot sign in; their history is kept."
      />
      <AddStaffForm
        onCreated={(email) => {
          reload();
          setNotice(`Account created for ${email}.`);
        }}
      />
      <div className="mb-4 space-y-2">
        {actionError && <Alert>{actionError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
      </div>
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-alt text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last sign-in</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.staff.map((staff) => {
                const isMe = staff.id === user.id;
                return (
                  <tr key={staff.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {staff.firstName} {staff.lastName}{' '}
                      {isMe && <span className="text-xs text-muted">(you)</span>}
                    </td>
                    <td className="px-4 py-3">{staff.email}</td>
                    <td className="px-4 py-3">
                      <RoleSelect
                        id={`role-${staff.id}`}
                        aria-label={`Role for ${staff.email}`}
                        value={staff.role}
                        disabled={isMe}
                        onChange={(role) =>
                          update(
                            staff,
                            { role },
                            `${staff.email} is now ${ROLE_LABELS[role]}. They need to sign in again.`
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      {staff.isActive ? (
                        <Badge tone="success">Active</Badge>
                      ) : (
                        <Badge>Deactivated</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {staff.lastLoginAt
                        ? new Date(staff.lastLoginAt).toLocaleString('en-CA')
                        : 'Never'}
                    </td>
                    <td className="space-y-2 px-4 py-3">
                      {!isMe && (
                        <Button
                          size="sm"
                          variant={staff.isActive ? 'danger' : 'secondary'}
                          onClick={() =>
                            update(
                              staff,
                              { isActive: !staff.isActive },
                              staff.isActive
                                ? `${staff.email} has been deactivated and signed out.`
                                : `${staff.email} has been reactivated.`
                            )
                          }
                        >
                          {staff.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      )}
                      <PasswordReset staff={staff} onDone={setNotice} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
