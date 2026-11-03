// Browser API client used by web/ and cms/: JSON in/out, same-origin cookies, and one silent
// session refresh when the 15-minute access token has expired.

const NO_RETRY = new Set(['/auth/login', '/auth/refresh', '/auth/logout', '/auth/register']);

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

export function createApiClient(base = '/api/v1') {
  // One refresh at a time, shared by all requests that got a 401 together.
  let refreshing = null;
  function refreshSession() {
    refreshing ??= fetch(`${base}/auth/refresh`, { method: 'POST', credentials: 'same-origin' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  }

  return async function api(path, { method = 'GET', body, headers = {}, retry = true } = {}) {
    const res = await fetch(base + path, {
      method,
      credentials: 'same-origin',
      headers: { ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (res.status === 401 && retry && !NO_RETRY.has(path) && (await refreshSession())) {
      return api(path, { method, body, headers, retry: false });
    }
    if (res.status === 204) return null;

    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, data);
    return data;
  };
}
