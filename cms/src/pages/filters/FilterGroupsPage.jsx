import { useState } from 'react';
import { can } from '@stemotics/shared';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useApiData } from '../../hooks/useApiData.js';
import { api } from '../../lib/api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  inputClass,
  Loading,
  PageHeader
} from '../../components/ui/index.jsx';

// Saves the new order of a list by writing each item's position.
async function saveOrder(items, pathFor) {
  await Promise.all(
    items.map((item, index) => api(pathFor(item), { method: 'PATCH', body: { sortOrder: index } }))
  );
}

function moved(list, index, direction) {
  const next = [...list];
  const target = index + direction;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Text that becomes an input with Save/Cancel when "Rename" is clicked.
function RenameInline({ value, label, onSave, disabled }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        <span>{value}</span>
        {!disabled && (
          <button
            type="button"
            className="text-xs text-brand underline"
            onClick={() => setEditing(true)}
          >
            Rename
          </button>
        )}
      </span>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(text.trim());
        setEditing(false);
      }}
    >
      <input
        aria-label={label}
        className={`${inputClass} max-w-64`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <Button size="sm" type="submit" disabled={!text.trim()}>
        Save
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  );
}

function AddInline({ placeholder, buttonLabel, onAdd }) {
  const [text, setText] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim()) return;
        await onAdd(text.trim());
        setText('');
      }}
    >
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        className={`${inputClass} max-w-72`}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={!text.trim()}>
        {buttonLabel}
      </Button>
    </form>
  );
}

export default function FilterGroupsPage() {
  const { user } = useAuth();
  const canEdit = can(user.role, 'filters.edit');
  const { data, error, loading, reload } = useApiData('/admin/filter-groups');
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function run(action, successMessage) {
    setActionError(null);
    setNotice(null);
    try {
      const result = await action();
      await reload();
      if (successMessage) setNotice(successMessage(result));
    } catch (err) {
      setActionError(err.message);
    }
  }

  const groups = data?.groups ?? [];

  return (
    <>
      <PageHeader
        title="Course Filters"
        description="Filter groups and options shown in the course listing sidebar. Tag courses with these options on each course's page; the listing updates automatically."
      />
      <div className="space-y-4">
        {actionError && <Alert>{actionError}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {loading && <Loading />}
        {error && <Alert>{error.message}</Alert>}

        {groups.map((group, groupIndex) => {
          const usage = group.options.reduce((sum, option) => sum + option.courseCount, 0);
          return (
            <Card key={group.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                  <RenameInline
                    value={group.name}
                    label={`Rename ${group.name}`}
                    disabled={!canEdit}
                    onSave={(name) =>
                      run(() =>
                        api(`/admin/filter-groups/${group.id}`, { method: 'PATCH', body: { name } })
                      )
                    }
                  />
                  {!group.isActive && <Badge>Hidden</Badge>}
                </h2>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={groupIndex === 0}
                      aria-label={`Move ${group.name} up`}
                      onClick={() =>
                        run(() =>
                          saveOrder(
                            moved(groups, groupIndex, -1),
                            (g) => `/admin/filter-groups/${g.id}`
                          )
                        )
                      }
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={groupIndex === groups.length - 1}
                      aria-label={`Move ${group.name} down`}
                      onClick={() =>
                        run(() =>
                          saveOrder(
                            moved(groups, groupIndex, 1),
                            (g) => `/admin/filter-groups/${g.id}`
                          )
                        )
                      }
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        run(() =>
                          api(`/admin/filter-groups/${group.id}`, {
                            method: 'PATCH',
                            body: { isActive: !group.isActive }
                          })
                        )
                      }
                    >
                      {group.isActive ? 'Hide from site' : 'Show on site'}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        const warning =
                          usage > 0
                            ? ` Its options are used ${usage} time(s) on courses; those tags will be removed.`
                            : '';
                        if (
                          window.confirm(
                            `Delete the "${group.name}" group and all its options?${warning}`
                          )
                        ) {
                          run(
                            () => api(`/admin/filter-groups/${group.id}`, { method: 'DELETE' }),
                            (result) =>
                              `Deleted "${group.name}". ${result.coursesUpdated} course(s) updated.`
                          );
                        }
                      }}
                    >
                      Delete group
                    </Button>
                  </div>
                )}
              </div>

              <ul className="divide-y divide-line rounded-md border border-line">
                {group.options.map((option, optionIndex) => (
                  <li
                    key={option.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <RenameInline
                      value={option.label}
                      label={`Rename ${option.label}`}
                      disabled={!canEdit}
                      onSave={(label) =>
                        run(() =>
                          api(`/admin/filter-options/${option.id}`, {
                            method: 'PATCH',
                            body: { label }
                          })
                        )
                      }
                    />
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted">{option.courseCount} course(s)</span>
                      {canEdit && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={optionIndex === 0}
                            aria-label={`Move ${option.label} up`}
                            onClick={() =>
                              run(() =>
                                saveOrder(
                                  moved(group.options, optionIndex, -1),
                                  (o) => `/admin/filter-options/${o.id}`
                                )
                              )
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={optionIndex === group.options.length - 1}
                            aria-label={`Move ${option.label} down`}
                            onClick={() =>
                              run(() =>
                                saveOrder(
                                  moved(group.options, optionIndex, 1),
                                  (o) => `/admin/filter-options/${o.id}`
                                )
                              )
                            }
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              const warning =
                                option.courseCount > 0
                                  ? ` It is used on ${option.courseCount} course(s); the tag will be removed from them.`
                                  : '';
                              if (window.confirm(`Delete "${option.label}"?${warning}`)) {
                                run(
                                  () =>
                                    api(`/admin/filter-options/${option.id}`, { method: 'DELETE' }),
                                  (result) =>
                                    `Deleted "${option.label}". ${result.coursesUpdated} course(s) updated.`
                                );
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </span>
                  </li>
                ))}
                {group.options.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted">No options yet.</li>
                )}
              </ul>

              {canEdit && (
                <div className="mt-3">
                  <AddInline
                    placeholder={`New option for ${group.name}`}
                    buttonLabel="Add option"
                    onAdd={(label) =>
                      run(() =>
                        api(`/admin/filter-groups/${group.id}/options`, {
                          method: 'POST',
                          body: { label }
                        })
                      )
                    }
                  />
                </div>
              )}
            </Card>
          );
        })}

        {canEdit && data && (
          <Card>
            <h2 className="mb-3 font-semibold text-ink">Add a filter group</h2>
            <AddInline
              placeholder="Group name, e.g. Location"
              buttonLabel="Add group"
              onAdd={(name) =>
                run(() => api('/admin/filter-groups', { method: 'POST', body: { name } }))
              }
            />
          </Card>
        )}
      </div>
    </>
  );
}
