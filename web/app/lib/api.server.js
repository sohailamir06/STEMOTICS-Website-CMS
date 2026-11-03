import { data } from 'react-router';

// API calls made by the SSR server (loaders/actions). The ".server" suffix keeps this file
// out of the browser bundle.
const API_URL = process.env.API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(path, status) {
    super(`API ${path} responded ${status}`);
    this.status = status;
  }
}

export async function apiGet(path, request) {
  const cookie = request?.headers.get('cookie');
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { accept: 'application/json', ...(cookie && { cookie }) },
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new ApiError(path, res.status);
  return res.json();
}

// In a loader: turns an API 404 into a real 404 page; anything else is a server error.
export function rethrowNotFound(err) {
  if (err instanceof ApiError && err.status === 404) throw data(null, { status: 404 });
  throw err;
}
