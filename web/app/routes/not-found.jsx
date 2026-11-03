import { data } from 'react-router';

// Catch-all: real 404 status for search engines, rendered by the root ErrorBoundary.
export function loader() {
  throw data(null, { status: 404 });
}

export default function NotFound() {
  return null;
}
